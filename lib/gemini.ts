import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import {
  UnderstandResult,
  SearchResultItem,
  TriagedUrl,
  OpportunityItem,
  OpportunityType,
  OpportunityMode,
} from "./types";
import { extractOpportunitiesFromMarkdown } from "./extractor";

// Ensure .env.local takes precedence
try {
  const envLocal = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal, override: true });
  }
} catch {
  // ignore
}

// Concurrency limiter for Gemini calls (max 4 parallel calls)
class GeminiLimiter {
  private activeCount = 0;
  private queue: Array<() => void> = [];
  private readonly maxConcurrency = 4;

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
}

const geminiLimiter = new GeminiLimiter();

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in .env.local");
  }
  return new GoogleGenAI({ apiKey });
}

function getCandidateModels(): string[] {
  const configured = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const defaults = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
  return Array.from(new Set([configured, ...defaults]));
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return cleaned.trim();
}

/**
 * Execute Gemini call with automatic retry and model fallback (handles 503 high-demand spikes)
 */
async function callGeminiWithRetry(prompt: string): Promise<string> {
  const ai = getGenAI();
  const models = getCandidateModels();

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Calling ${model} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: unknown) {
        const errObj = err as { message?: string; status?: number };
        const msg = errObj.message || String(err);
        console.warn(
          `[Gemini] ${model} attempt ${attempt} failed:`,
          msg
        );

        // If daily limit exceeded or model no longer available, immediately skip to next model
        if (
          msg.includes("per day limit exceeded") ||
          msg.includes("no longer available") ||
          msg.includes("not found")
        ) {
          console.warn(`[Gemini] Skipping ${model} due to hard quota/availability limit.`);
          break;
        }

        // If 503 or 429 RPM spike, wait 1.5s before retry
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  throw new Error("Gemini AI models are temporarily experiencing high demand. Please try again in a moment.");
}

function fallbackUnderstand(
  lookingFor: string,
  profile: string,
  selectedCategory?: string
): UnderstandResult {
  const combined = `${lookingFor} ${profile}`.toLowerCase();
  const categories: string[] = [];
  if (selectedCategory && selectedCategory !== "All") {
    categories.push(selectedCategory);
  } else {
    if (combined.includes("intern") || combined.includes("job") || combined.includes("stipend") || combined.includes("engineer")) categories.push("Internships");
    if (combined.includes("hack") || combined.includes("build") || combined.includes("devpost") || combined.includes("devfolio")) categories.push("Hackathons");
    if (combined.includes("compete") || combined.includes("contest") || combined.includes("quiz") || combined.includes("challenge") || combined.includes("kaggle")) categories.push("Competitions");
    if (combined.includes("scholarship") || combined.includes("grant") || combined.includes("tuition")) categories.push("Scholarships");
    if (combined.includes("fellowship") || combined.includes("research")) categories.push("Fellowships");
    if (combined.includes("open source") || combined.includes("gsoc") || combined.includes("git") || combined.includes("github") || combined.includes("foss")) categories.push("Open Source");
    if (categories.length === 0) categories.push("Internships", "Hackathons");
  }

  const rawWords = combined
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "this", "that", "from", "are", "you", "looking", "have", "want", "seeking"].includes(w));
  const uniqueWords = Array.from(new Set(rawWords)).slice(0, 8);

  const mainCat = categories[0] || "Opportunity";
  const search_queries = [
    `${uniqueWords.slice(0, 3).join(" ")} ${mainCat.toLowerCase()} apply India`,
    `${uniqueWords.slice(0, 2).join(" ")} register 2026`,
    `${uniqueWords.slice(1, 4).join(" ")} stipend remote`,
    `${lookingFor.slice(0, 40)} apply`,
  ];

  return {
    categories,
    keywords: uniqueWords,
    skills: uniqueWords.slice(0, 4),
    level: combined.includes("1st") ? "1st year" : combined.includes("2nd") ? "2nd year" : combined.includes("3rd") ? "3rd year" : combined.includes("final") ? "final year" : "any",
    location_preference: combined.includes("remote") ? "remote" : combined.includes("bengaluru") || combined.includes("bangalore") ? "Bengaluru" : "any",
    search_queries,
  };
}

/**
 * STEP 1 - UNDERSTAND
 * Understand student profile and formulate targeted search queries
 */
export async function understandStudentProfile(
  lookingFor: string,
  profile: string,
  todayDate: string,
  selectedCategory?: string
): Promise<UnderstandResult> {
  return geminiLimiter.run(async () => {
    const categoryContext =
      selectedCategory && selectedCategory !== "All"
        ? `The user explicitly selected category: "${selectedCategory}". Focus heavily on this category.`
        : `The user selected "All", so select all matching categories among: Internships, Hackathons, Competitions, Scholarships, Fellowships, Open Source.`;

    const prompt = `You are an expert career and opportunity advisor for Indian college students.
Analyze what the student is looking for and their profile to formulate targeted search strategies.

Current date: ${todayDate}
User Looking For: "${lookingFor}"
User Profile: "${profile}"
${categoryContext}

Extract and generate a valid JSON object matching this schema:
{
  "categories": ["Internships", "Hackathons", ...from the 6 categories: Internships, Hackathons, Competitions, Scholarships, Fellowships, Open Source],
  "keywords": [5 to 8 specific keywords, e.g. "machine learning", "NLP", "Python", "stipend", "react"],
  "skills": [extracted relevant technical/soft skills],
  "level": "1st year" | "2nd year" | "3rd year" | "final year" | "graduate" | "any",
  "location_preference": "remote" | "<specific city>" | "any",
  "search_queries": [
    5 short, specific search queries combining the student's keywords with high-intent opportunity action words like "internship apply", "hackathon registration open", "scholarship 2026-27 last date", "fellowship apply", "competition register"
  ]
}

Important:
- Keep search_queries concise (3-5 words each), focused on current/open opportunities in India or Remote.
- Ensure keywords are exact and high-signal.`;

    try {
      const text = await callGeminiWithRetry(prompt);
      const parsed = JSON.parse(cleanJsonText(text)) as {
        categories?: string[];
        keywords?: string[];
        skills?: string[];
        level?: string;
        location_preference?: string;
        search_queries?: string[];
      };

      console.log("[Gemini] Profile understood:", {
        categories: parsed.categories,
        keywords: parsed.keywords,
        queries: parsed.search_queries,
      });

      return {
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : ["Internships"],
        keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : ["internship", "stipend"],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        level: parsed.level || "any",
        location_preference: parsed.location_preference || "any",
        search_queries: Array.isArray(parsed.search_queries) && parsed.search_queries.length > 0 ? parsed.search_queries.slice(0, 5) : [`${lookingFor} apply`],
      };
    } catch (err: unknown) {
      console.warn("[Gemini] understandStudentProfile hit rate limit or high demand. Using deterministic profile parsing fallback:", err);
      return fallbackUnderstand(lookingFor, profile, selectedCategory);
    }
  });
}

/**
 * STEP 3 - TRIAGE SEARCH RESULTS
 * Pick up to 8 of the most promising URLs that look like specific opportunities or active listings
 */
export async function triageSearchResults(
  results: SearchResultItem[],
  keywords: string[]
): Promise<TriagedUrl[]> {
  if (results.length === 0) return [];

  return geminiLimiter.run(async () => {
    const prompt = `You are an AI opportunity triager.
Review the following web search results and user keywords:
Keywords: ${JSON.stringify(keywords)}

Search Results:
${JSON.stringify(
  results.map((r, i) => ({
    index: i,
    title: r.title,
    snippet: r.snippet,
    url: r.url,
    date: r.date,
  })),
  null,
  2
)}

Task:
Pick up to 8 of the MOST PROMISING URLs that look like a SPECIFIC opportunity page or a live opportunity listing page that matches the keywords.
STRICT FILTERING RULES:
1. REJECT generic listicles (e.g., "top 10", "best 5", "how to prepare", "tips for").
2. REJECT news recaps, press releases, blog opinions, tutorial blogs.
3. REJECT winners/results pages, past year archives, or anything clearly past its deadline.
4. PREFER direct application pages, active portal listings, and official program pages.

Return a JSON array of objects:
[
  {
    "url": "https://...",
    "reason": "Short 1-sentence reason why this URL is promising and relevant"
  }
]`;

    try {
      const text = await callGeminiWithRetry(prompt);
      const parsed = JSON.parse(cleanJsonText(text));

      const triaged: TriagedUrl[] = Array.isArray(parsed)
        ? parsed
            .filter(
              (item): item is { url: string; reason: string } =>
                item !== null &&
                typeof item === "object" &&
                typeof (item as Record<string, unknown>).url === "string"
            )
            .slice(0, 8)
        : [];

      console.log(`[Gemini] Triaged down to ${triaged.length} promising URLs:`);
      triaged.forEach((t, i) => console.log(`  ${i + 1}. [${t.url}] -> ${t.reason}`));

      if (triaged.length > 0) {
        return triaged;
      }
    } catch (err: unknown) {
      console.warn("[Gemini] triageSearchResults fallback triggered:", err);
    }

    // Deterministic triage: prioritize items that contain user keywords in title or snippet
    const scored = results.map((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      const matches = keywords.filter((k) => text.includes(k.toLowerCase())).length;
      return { r, matches };
    });
    scored.sort((a, b) => b.matches - a.matches);
    return scored.slice(0, 8).map((s) => ({
      url: s.r.url,
      reason: s.r.title,
      estimated_match: s.matches > 0 ? "High" : "Medium",
    }));
  });
}

/**
 * STEP 5 - EXTRACT AND MATCH FROM PAGE TEXT
 */
export async function extractOpportunitiesFromPage(
  pageText: string,
  pageUrl: string,
  sourceName: string,
  todayDate: string,
  keywords: string[],
  profile: string
): Promise<OpportunityItem[]> {
  const truncatedText = pageText.slice(0, 20000);
  if (!truncatedText.trim()) return [];

  return geminiLimiter.run(async () => {
    let domain = "web";
    try {
      domain = new URL(pageUrl).hostname;
    } catch {
      // ignore
    }

    const prompt = `You are an AI opportunity extractor.
Extract ONLY real, specific opportunities that are currently open or upcoming as of today (${todayDate}).
Ignore ads, navigation, and expired items. If the program is between cycles or has passed, do not include it.
If a deadline does not have a specific day, set deadline_iso to null and deadline_text to "Rolling / Check link".

Context:
Today's Date: ${todayDate}
Source Page URL: ${pageUrl}
Source Name: ${sourceName}
Student Profile: "${profile}"
Target Keywords: ${JSON.stringify(keywords)}

Page Content (first 20,000 chars):
---
${truncatedText}
---

Return a JSON array of up to 10 items:
[
  {
    "title": "Title of the opportunity (e.g. AI/ML Engineer Intern, Devfolio Hackathon, or GSoC 2027)",
    "organization": "Company, college, or host organization",
    "type": "Internship" | "Hackathon" | "Competition" | "Scholarship" | "Fellowship" | "Open Source",
    "mode": "Online" | "In-person" | "Hybrid" | "Remote" | "Unknown",
    "location": "City, State/Country or 'Remote' or 'Across India'",
    "deadline_text": "Deadline as written on the page (e.g. 'Nov 22, 2026', 'Rolling', or 'Not listed')",
    "deadline_iso": "YYYY-MM-DD or null if not explicitly stated with a specific day",
    "eligibility": "One line summarizing who is eligible",
    "stipend_or_prize": "Stipend, salary, award, or prize amount if mentioned, else null",
    "link": "The specific opportunity application URL if present in the page text/links, otherwise '${pageUrl}'",
    "evidence": "Short exact quote from the page showing the deadline or open status",
    "keyword_matches": ["subset of user keywords that this item directly matches"],
    "fit_score": 8, // Integer 1-10
    "why_it_fits": "One encouraging, specific sentence written directly to the student explaining why this opportunity is a great match"
  }
]`;

    try {
      const text = await callGeminiWithRetry(prompt);
      const parsed = JSON.parse(cleanJsonText(text));

      if (Array.isArray(parsed) && parsed.length > 0) {
        const items: OpportunityItem[] = parsed.map((rawItem: unknown, idx: number) => {
          const item = (rawItem && typeof rawItem === "object" ? rawItem : {}) as Record<string, unknown>;
          const title = typeof item.title === "string" ? item.title : "Untitled Opportunity";
          const org = typeof item.organization === "string" ? item.organization : sourceName;
          const type = (typeof item.type === "string" ? item.type : "Internship") as OpportunityType;
          const mode = (typeof item.mode === "string" ? item.mode : "Unknown") as OpportunityMode;
          const loc = typeof item.location === "string" ? item.location : "India / Remote";
          const dText = typeof item.deadline_text === "string" ? item.deadline_text : "Deadline not listed";
          const dIso = typeof item.deadline_iso === "string" ? item.deadline_iso : null;
          const elig = typeof item.eligibility === "string" ? item.eligibility : "Check details on application page";
          const stipend = typeof item.stipend_or_prize === "string" ? item.stipend_or_prize : null;
          const link = typeof item.link === "string" && item.link.startsWith("http") ? item.link : pageUrl;
          const evidence = typeof item.evidence === "string" ? item.evidence : "Found on active program page";
          const kwMatches = Array.isArray(item.keyword_matches) ? (item.keyword_matches as string[]) : [];
          const fitScore = typeof item.fit_score === "number" ? Math.max(1, Math.min(10, Math.round(item.fit_score))) : 7;
          const whyFits = typeof item.why_it_fits === "string" ? item.why_it_fits : "Matches your academic background and interests.";

          return {
            id: `${domain}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            title,
            organization: org,
            type,
            mode,
            location: loc,
            deadline_text: dText,
            deadline_iso: dIso,
            eligibility: elig,
            stipend_or_prize: stipend,
            link,
            evidence,
            keyword_matches: kwMatches,
            fit_score: fitScore,
            why_it_fits: whyFits,
            source_name: sourceName,
            source_domain: domain,
            extracted_at: new Date().toISOString(),
          };
        });

        console.log(`[Gemini] Extracted ${items.length} opportunities from ${pageUrl}`);
        if (items.length > 0) {
          return items;
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Page AI extraction failed (${errorMsg}), using markdown extractor for ${pageUrl}`);
    }

    // Heuristic markdown fallback
    return extractOpportunitiesFromMarkdown(pageText, pageUrl, sourceName, keywords, todayDate);
  });
}

/**
 * STEP 5.B - EXTRACT OPPORTUNITIES FROM SEARCH RESULTS
 * Ensures that verified search results (which already include titles, stipends, and URLs) are extracted
 */
export async function extractOpportunitiesFromSearchSnippets(
  searchResults: SearchResultItem[],
  todayDate: string,
  keywords: string[],
  profile: string
): Promise<OpportunityItem[]> {
  if (searchResults.length === 0) return [];

  return geminiLimiter.run(async () => {
    const prompt = `You are an AI opportunity extractor.
Review these live search results from trusted Indian opportunity portals and extract real opportunities for this student.

Current Date: ${todayDate}
Student Profile: "${profile}"
Keywords: ${JSON.stringify(keywords)}

Live Search Results:
${JSON.stringify(searchResults.slice(0, 15), null, 2)}

Extract up to 10 specific, currently open opportunities.
Return a JSON array:
[
  {
    "title": "Title of the opportunity",
    "organization": "Company or portal name",
    "type": "Internship" | "Hackathon" | "Competition" | "Scholarship" | "Fellowship" | "Open Source",
    "mode": "Remote" | "In-person" | "Online" | "Hybrid",
    "location": "Location (city or Remote/India)",
    "deadline_text": "Extracted deadline from snippet or 'Rolling / Check link'",
    "deadline_iso": "YYYY-MM-DD or null",
    "eligibility": "One line eligibility",
    "stipend_or_prize": "Stipend or prize if mentioned",
    "link": "The URL of the result",
    "evidence": "Quote from snippet",
    "keyword_matches": ["matched keywords"],
    "fit_score": 8,
    "why_it_fits": "Personalized sentence why it fits"
  }
]`;

    try {
      const text = await callGeminiWithRetry(prompt);
      const parsed = JSON.parse(cleanJsonText(text));

      if (!Array.isArray(parsed)) return [];

      return parsed.map((rawItem: unknown, idx: number) => {
        const item = (rawItem && typeof rawItem === "object" ? rawItem : {}) as Record<string, unknown>;
        let domain = "portal";
        const link = typeof item.link === "string" ? item.link : "";
        try {
          if (link) domain = new URL(link).hostname;
        } catch {
          // ignore
        }
        return {
          id: `search-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          title: typeof item.title === "string" ? item.title : "Opportunity",
          organization: typeof item.organization === "string" ? item.organization : domain,
          type: (typeof item.type === "string" ? item.type : "Internship") as OpportunityType,
          mode: (typeof item.mode === "string" ? item.mode : "Unknown") as OpportunityMode,
          location: typeof item.location === "string" ? item.location : "India / Remote",
          deadline_text: typeof item.deadline_text === "string" ? item.deadline_text : "Rolling / Check link",
          deadline_iso: typeof item.deadline_iso === "string" ? item.deadline_iso : null,
          eligibility: typeof item.eligibility === "string" ? item.eligibility : "Open to eligible students",
          stipend_or_prize: typeof item.stipend_or_prize === "string" ? item.stipend_or_prize : null,
          link,
          evidence: typeof item.evidence === "string" ? item.evidence : "Found via live verified web search",
          keyword_matches: Array.isArray(item.keyword_matches) ? (item.keyword_matches as string[]) : [],
          fit_score: typeof item.fit_score === "number" ? Math.max(1, Math.min(10, Math.round(item.fit_score))) : 8,
          why_it_fits: typeof item.why_it_fits === "string" ? item.why_it_fits : "Matches your target keywords and academic profile.",
          source_name: domain,
          source_domain: domain,
          extracted_at: new Date().toISOString(),
        };
      });
    } catch (err: unknown) {
      console.warn("[Gemini] Failed to extract from search snippets:", err);
      return [];
    }
  });
}
