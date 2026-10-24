import { NextRequest } from "next/server";
import {
  TRUSTED_SOURCES,
  getSourcesForCategories,
  getDomainsForCategories,
  getSourceByDomain,
} from "@/config/sources";
import {
  OpportunityItem,
  PipelineSSEEvent,
  RadarRequest,
  SearchResultItem,
  SourceStatusItem,
} from "@/lib/types";
import { searchOpportunities, fetchPages, TinyFishError } from "@/lib/tinyfish";
import {
  understandStudentProfile,
  triageSearchResults,
  extractOpportunitiesFromPage,
  extractOpportunitiesFromSearchSnippets,
} from "@/lib/gemini";
import { extractOpportunitiesFromSearchResults } from "@/lib/extractor";

// Helper to normalize strings for deduping
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function dedupeSearchResults(items: SearchResultItem[], maxPerDomain = 3): SearchResultItem[] {
  const seenUrls = new Set<string>();
  const domainCounts = new Map<string, number>();
  const deduped: SearchResultItem[] = [];

  for (const item of items) {
    if (!item.url) continue;
    const cleanUrl = item.url.split("#")[0].trim();
    if (seenUrls.has(cleanUrl)) continue;

    let domain = "";
    try {
      domain = new URL(cleanUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      continue;
    }

    const count = domainCounts.get(domain) || 0;
    if (count >= maxPerDomain) continue;

    seenUrls.add(cleanUrl);
    domainCounts.set(domain, count + 1);
    deduped.push(item);
  }

  return deduped;
}

export async function POST(req: NextRequest) {
  let body: RadarRequest;
  try {
    body = (await req.json()) as RadarRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { lookingFor, profile, category = "All" } = body;

  if (!lookingFor || !profile) {
    return new Response(
      JSON.stringify({ error: "Both 'lookingFor' and 'profile' fields are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineSSEEvent) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      // Periodic heartbeat ping every 4 seconds to maintain active SSE connection
      const heartbeatInterval = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          isClosed = true;
          clearInterval(heartbeatInterval);
        }
      }, 4000);

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
      });

      try {
        const todayDate = new Date().toISOString().split("T")[0];
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        console.log(`\n==================================================`);
        console.log(`[Opportunity Radar] New run started: ${todayDate}`);
        console.log(`Looking For: "${lookingFor}"`);
        console.log(`Profile: "${profile}"`);
        console.log(`Category: "${category}"`);
        console.log(`==================================================\n`);

        // Initialize Sources status table with all 20 sources
        const sourceStatusMap = new Map<string, SourceStatusItem>();
        TRUSTED_SOURCES.forEach((s) => {
          sourceStatusMap.set(s.domain, {
            name: s.name,
            url: s.url,
            domain: s.domain,
            category: s.category,
            jsHeavy: s.jsHeavy,
            status: "unused",
            opportunitiesFound: 0,
          });
        });

        // ----------------------------------------------------
        // STEP 1 - UNDERSTAND (Gemini)
        // ----------------------------------------------------
        send({
          type: "step",
          step: "understanding",
          message: "Analyzing your profile and formulating targeted search strategies...",
          progress: 10,
        });

        const understanding = await understandStudentProfile(
          lookingFor,
          profile,
          todayDate,
          category
        );

        console.log(`[Pipeline] Step 1 complete. Extracted keywords:`, understanding.keywords);
        console.log(`[Pipeline] Generated search queries:`, understanding.search_queries);

        send({
          type: "understand",
          data: understanding,
        });

        send({
          type: "step",
          step: "searching",
          message: `Generated queries: ${understanding.search_queries.length}. Searching trusted portals across India...`,
          progress: 25,
        });

        // Determine active sources and categories
        const activeCategories =
          category && category !== "All"
            ? [category]
            : understanding.categories.length > 0
            ? understanding.categories
            : ["Internships", "Hackathons", "Competitions", "Scholarships", "Fellowships", "Open Source"];

        const activeSources = getSourcesForCategories(activeCategories);
        const includeDomains = getDomainsForCategories(activeCategories);
        const includeDomainsStr = includeDomains.join(",");

        console.log(`[Pipeline] Active categories:`, activeCategories);
        console.log(`[Pipeline] Trusted domains (${includeDomains.length}):`, includeDomainsStr);

        // Mark active sources as pending/ok status
        activeSources.forEach((s) => {
          const item = sourceStatusMap.get(s.domain);
          if (item) item.status = "ok";
        });

        // ----------------------------------------------------
        // STEP 2 - GATHER (Run A and B in parallel)
        // ----------------------------------------------------
        console.log(`[Pipeline] Step 2: Gathering search results and listing pages in parallel...`);

        // A) Keyword searches on TinyFish Search
        const searchPromises: Promise<SearchResultItem[]> = (async () => {
          const allFound: SearchResultItem[] = [];

          // Run each search_query on TinyFish Search
          for (const query of understanding.search_queries) {
            try {
              const res = await searchOpportunities({
                query,
                location: "IN",
                language: "en",
                after_date: sixtyDaysAgo,
                include_domains: includeDomainsStr,
              });
              allFound.push(...res);
            } catch (err: unknown) {
              const errorMsg = err instanceof TinyFishError ? err.friendlyMessage : String(err);
              console.warn(`[Pipeline] TinyFish search failed for "${query}":`, errorMsg);
              if (err instanceof TinyFishError && err.statusCode === 401) {
                throw err;
              }
            }
          }

          // ONE extra open-web search with the best query (the first one)
          const bestQuery = understanding.search_queries[0] || `${lookingFor} apply`;
          try {
            console.log(`[Pipeline] Running open-web search with best query: "${bestQuery}"`);
            const openWebRes = await searchOpportunities({
              query: bestQuery,
              location: "IN",
              language: "en",
              after_date: sixtyDaysAgo,
              exclude_domains:
                "instagram.com,facebook.com,x.com,twitter.com,linkedin.com,youtube.com,reddit.com,pinterest.com,quora.com,medium.com",
            });
            allFound.push(...openWebRes);
          } catch (err: unknown) {
            const errorMsg = err instanceof TinyFishError ? err.friendlyMessage : String(err);
            console.warn(`[Pipeline] TinyFish open-web search failed:`, errorMsg);
          }

          return allFound;
        })();

        // B) Source listing pages
        const listingUrls: Array<{ url: string; sourceName: string }> = [];
        activeSources.forEach((s) => {
          listingUrls.push({ url: s.url, sourceName: s.name });
        });

        // For Internshala, try keyword URL for top 2 keywords:
        if (activeCategories.includes("Internships") || category === "All") {
          const topKeywords = understanding.keywords.slice(0, 2);
          for (const kw of topKeywords) {
            const slug = kw
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            if (slug) {
              const internshalaKeywordUrl = `https://internshala.com/internships/${slug}-internship/`;
              listingUrls.push({
                url: internshalaKeywordUrl,
                sourceName: `Internshala (${kw})`,
              });
            }
          }
        }

        // Wait for search results
        const rawSearchResults = await searchPromises;
        console.log(`[Pipeline] Total raw search results gathered: ${rawSearchResults.length}`);

        // Merge and dedupe by URL, max 3 URLs per domain
        const dedupedSearchResults = dedupeSearchResults(rawSearchResults, 3);
        console.log(`[Pipeline] Deduped search results: ${dedupedSearchResults.length}`);

        // ----------------------------------------------------
        // STEP 3 - TRIAGE SEARCH RESULTS (Gemini)
        // ----------------------------------------------------
        send({
          type: "step",
          step: "triaging",
          message: `Triaging ${dedupedSearchResults.length} search hits to select high-signal opportunity pages...`,
          progress: 45,
        });

        const triagedUrls = await triageSearchResults(
          dedupedSearchResults,
          understanding.keywords
        );

        console.log(`[Pipeline] Step 3 complete. Triaged URLs: ${triagedUrls.length}`);

        // ----------------------------------------------------
        // STEP 4 - FETCH (TinyFish Fetch in batches of 10)
        // ----------------------------------------------------
        send({
          type: "step",
          step: "fetching",
          message: `Reading listings and verified opportunity pages...`,
          progress: 60,
        });

        // Prioritize triaged direct opportunity URLs first, then listing URLs
        const combinedUrlsMap = new Map<string, string>(); // url -> sourceName

        triagedUrls.forEach((item) => {
          let domain = "web";
          try {
            domain = new URL(item.url).hostname;
          } catch {
            // ignore
          }
          const matchedSource = getSourceByDomain(domain);
          combinedUrlsMap.set(item.url, matchedSource ? matchedSource.name : domain);
        });

        listingUrls.forEach((item) => {
          if (!combinedUrlsMap.has(item.url)) {
            combinedUrlsMap.set(item.url, item.sourceName);
          }
        });

        const allUrlsToFetch = Array.from(combinedUrlsMap.keys());
        console.log(`[Pipeline] Fetching ${allUrlsToFetch.length} total pages with TinyFish Fetch...`);

        // Fetch pages with progress callback streaming to SSE
        const fetchedPages = await fetchPages(allUrlsToFetch, (url, status, chars) => {
          const sourceName = combinedUrlsMap.get(url) || url;
          send({
            type: "reading_page",
            data: {
              url,
              sourceName,
              status,
              chars,
            },
          });

          // Update source status
          try {
            const domain = new URL(url).hostname.replace(/^www\./, "");
            for (const [sDomain, sItem] of sourceStatusMap.entries()) {
              if (domain.includes(sDomain) || sDomain.includes(domain)) {
                sItem.status = status;
                sItem.charCount = Math.max(sItem.charCount || 0, chars);
              }
            }
          } catch {
            // ignore
          }
        });

        // Emit updated sources status to client
        send({
          type: "sources_update",
          data: Array.from(sourceStatusMap.values()),
        });

        // ----------------------------------------------------
        // STEP 5 - EXTRACT AND MATCH (Gemini, parallel max 4)
        // ----------------------------------------------------
        send({
          type: "step",
          step: "extracting",
          message: "Extracting verified live opportunities and computing student fit scores...",
          progress: 75,
        });

        // Prepare pages to extract from (skip failed ones with 0 chars)
        const pagesToExtract = Object.values(fetchedPages).filter(
          (p) => p.text && p.text.length > 50
        );

        console.log(
          `[Pipeline] Running Gemini extraction on ${pagesToExtract.length} pages...`
        );

        const allExtractedOpportunities: OpportunityItem[] = [];

        // 1. Harvest verified opportunities directly from TinyFish search results
        if (dedupedSearchResults.length > 0) {
          console.log(`[Pipeline] Extracting direct opportunities from ${dedupedSearchResults.length} verified search results...`);
          const searchOpportunitiesHarvested = extractOpportunitiesFromSearchResults(
            dedupedSearchResults,
            understanding.keywords,
            category,
            todayDate
          );
          console.log(`[Pipeline] Harvested ${searchOpportunitiesHarvested.length} opportunities from search results`);
          allExtractedOpportunities.push(...searchOpportunitiesHarvested);

          // Update source opportunities counts
          for (const item of searchOpportunitiesHarvested) {
            for (const [sDomain, sItem] of sourceStatusMap.entries()) {
              if (item.source_domain.includes(sDomain) || sDomain.includes(item.source_domain)) {
                sItem.opportunitiesFound++;
              }
            }
          }
        }

        // 2. Select top 3 content-rich fetched pages to analyze with Gemini / markdown parser
        const targetPages = pagesToExtract
          .sort((a, b) => b.text.length - a.text.length)
          .slice(0, 3);

        console.log(`[Pipeline] Extracting deep opportunities from top ${targetPages.length} fetched pages...`);
        let completedExtractions = 0;

        for (const page of targetPages) {
          const sourceName = combinedUrlsMap.get(page.url) || page.title || "Portal";
          const items = await extractOpportunitiesFromPage(
            page.text,
            page.url,
            sourceName,
            todayDate,
            understanding.keywords,
            profile
          );

          completedExtractions++;
          allExtractedOpportunities.push(...items);

          // Update opportunitiesFound on source
          try {
            const domain = new URL(page.url).hostname.replace(/^www\./, "");
            for (const [sDomain, sItem] of sourceStatusMap.entries()) {
              if (domain.includes(sDomain) || sDomain.includes(domain)) {
                sItem.opportunitiesFound += items.length;
              }
            }
          } catch {
            // ignore
          }

          send({
            type: "step",
            step: "extracting",
            message: `Analyzed ${completedExtractions}/${targetPages.length} pages... Found ${allExtractedOpportunities.length} opportunities.`,
            progress: 75 + Math.round((completedExtractions / targetPages.length) * 15),
          });
        }

        console.log(
          `[Pipeline] Total raw opportunities gathered: ${allExtractedOpportunities.length}`
        );

        // If no opportunities were gathered, harvest from verified search snippets
        if (allExtractedOpportunities.length === 0 && dedupedSearchResults.length > 0) {
          console.log(`[Pipeline] Harvesting verified opportunities from search snippets...`);
          const snippetItems = await extractOpportunitiesFromSearchSnippets(
            dedupedSearchResults,
            todayDate,
            understanding.keywords,
            profile
          );
          console.log(`[Pipeline] Harvested ${snippetItems.length} opportunities from search snippets`);
          allExtractedOpportunities.push(...snippetItems);
        }

        // ----------------------------------------------------
        // STEP 6 - VALIDATE AND RANK (in code, not AI)
        // ----------------------------------------------------
        send({
          type: "step",
          step: "ranking",
          message: "Validating deadlines, deduplicating, and ranking top opportunities...",
          progress: 95,
        });

        let expiredCount = 0;
        const validItems: OpportunityItem[] = [];

        for (const item of allExtractedOpportunities) {
          // Drop items where deadline_iso is before today
          if (item.deadline_iso) {
            if (item.deadline_iso < todayDate) {
              expiredCount++;
              continue;
            }
          } else {
            // Items with deadline_iso null are kept but labelled "Deadline not listed - check link"
            if (!item.deadline_text || item.deadline_text.toLowerCase().includes("not listed")) {
              item.deadline_text = "Deadline not listed - check link";
            }
          }
          validItems.push(item);
        }

        console.log(`[Pipeline] Items dropped as expired: ${expiredCount}`);
        console.log(`[Pipeline] Valid active items remaining: ${validItems.length}`);

        // Dedupe by normalized title + organization (keep the one with more info)
        const dedupedMap = new Map<string, OpportunityItem>();

        for (const item of validItems) {
          const key = `${normalizeText(item.title)}||${normalizeText(item.organization)}`;
          const existing = dedupedMap.get(key);

          if (!existing) {
            dedupedMap.set(key, item);
          } else {
            const currentInfoScore =
              (item.eligibility?.length || 0) +
              (item.evidence?.length || 0) +
              (item.stipend_or_prize ? 50 : 0) +
              item.fit_score * 10;
            const existingInfoScore =
              (existing.eligibility?.length || 0) +
              (existing.evidence?.length || 0) +
              (existing.stipend_or_prize ? 50 : 0) +
              existing.fit_score * 10;

            if (currentInfoScore > existingInfoScore) {
              dedupedMap.set(key, item);
            }
          }
        }

        const dedupedList = Array.from(dedupedMap.values());
        console.log(`[Pipeline] Items after deduplication: ${dedupedList.length}`);

        // Sort by fit_score desc, then nearest deadline
        dedupedList.sort((a, b) => {
          if (b.fit_score !== a.fit_score) {
            return b.fit_score - a.fit_score;
          }
          if (a.deadline_iso && !b.deadline_iso) return -1;
          if (!a.deadline_iso && b.deadline_iso) return 1;
          if (a.deadline_iso && b.deadline_iso) {
            return a.deadline_iso.localeCompare(b.deadline_iso);
          }
          return 0;
        });

        // Return max 30 items
        const finalResults = dedupedList.slice(0, 30);
        console.log(`[Pipeline] Final ranked opportunities returned: ${finalResults.length}`);

        // Update counts on sources panel
        finalResults.forEach((res) => {
          const domain = res.source_domain.replace(/^www\./, "");
          for (const [sDomain, sItem] of sourceStatusMap.entries()) {
            if (domain.includes(sDomain) || sDomain.includes(domain)) {
              sItem.opportunitiesFound += 1;
            }
          }
        });

        // Send final sources status update with accurate counts
        send({
          type: "sources_update",
          data: Array.from(sourceStatusMap.values()),
        });

        // Send final results
        send({
          type: "results",
          data: finalResults,
        });

        send({
          type: "step",
          step: "done",
          message: `Radar search complete! Found ${finalResults.length} active opportunities.`,
          progress: 100,
        });

        send({
          type: "done",
          data: {
            count: finalResults.length,
            expiredFiltered: expiredCount,
            sourcesQueried: activeSources.length,
          },
        });
      } catch (err: unknown) {
        console.error("[Pipeline Error]", err);
        let friendlyMessage = "An error occurred while finding opportunities.";
        if (err instanceof TinyFishError) {
          friendlyMessage = err.friendlyMessage;
        } else if (err instanceof Error) {
          if (err.message.includes("API key")) {
            friendlyMessage = "Your API key looks wrong. Please check your .env.local file.";
          } else if (err.message.includes("429")) {
            friendlyMessage = "Too many requests, wait a minute.";
          } else if (err.message.includes("402")) {
            friendlyMessage = "Daily free limit reached.";
          } else {
            friendlyMessage = err.message;
          }
        }

        send({
          type: "error",
          step: "error",
          message: friendlyMessage,
        });
      } finally {
        clearInterval(heartbeatInterval);
        if (!isClosed) {
          try {
            controller.close();
          } catch {
            // ignore
          }
          isClosed = true;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
