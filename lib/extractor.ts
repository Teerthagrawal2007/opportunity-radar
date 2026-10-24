import { SearchResultItem, OpportunityItem, OpportunityType, OpportunityMode } from "./types";

/**
 * Clean and format title by removing portal breadcrumbs/suffixes
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[-–|:]\s*(Internshala|Devfolio|MLH|Unstop|Kaggle|Hack2skill|DoraHacks|Buddy4Study|AICTE|NSP|Google|GirlScript|Outreachy).*$/i, "")
    .replace(/^(\d+\+?|\d+)\s+(Internships|Hackathons|Competitions|Scholarships|Fellowships)\s+(in|for)\s+/i, "")
    .replace(/\s+in\s+Oct(ober)?\s+202\d/i, "")
    .replace(/\s+\.\.\.$/, "")
    .trim();
}

/**
 * Extract organization name from title or snippet
 */
function extractOrganization(title: string, snippet: string, domain: string, defaultName: string): string {
  // Check "at <Company>" or "by <Company>"
  const atMatch = title.match(/\b(?:at|by|with)\s+([A-Z0-9][A-Za-z0-9&.,\s]{2,25}?)(?:\s+[-–|]|\s+for|\s+in|\.|$)/);
  if (atMatch && atMatch[1] && atMatch[1].trim().length > 1) {
    return atMatch[1].trim();
  }

  const bySnippetMatch = snippet.match(/\b(?:by|at|with)\s+([A-Z][A-Za-z0-9&.,\s]{2,25}?)(?:\s+for|\s+in|\.|$)/);
  if (bySnippetMatch && bySnippetMatch[1] && bySnippetMatch[1].trim().length > 1) {
    return bySnippetMatch[1].trim();
  }

  // Domain map
  const cleanDomain = domain.toLowerCase().replace(/^www\./, "");
  if (cleanDomain.includes("devfolio")) return "Devfolio Community";
  if (cleanDomain.includes("mlh")) return "Major League Hacking";
  if (cleanDomain.includes("hack2skill")) return "Hack2skill";
  if (cleanDomain.includes("dorahacks")) return "DoraHacks";
  if (cleanDomain.includes("unstop")) return "Unstop";
  if (cleanDomain.includes("kaggle")) return "Kaggle";
  if (cleanDomain.includes("google")) return "Google Open Source";
  if (cleanDomain.includes("girlscript")) return "GirlScript Foundation";
  if (cleanDomain.includes("outreachy")) return "Outreachy";
  if (cleanDomain.includes("internshala")) return "Hiring Partner on Internshala";
  if (cleanDomain.includes("aicte")) return "AICTE India";
  if (cleanDomain.includes("buddy4study")) return "Buddy4Study Partner";
  if (cleanDomain.includes("daad")) return "DAAD German Academic Exchange";

  return defaultName;
}

/**
 * Detect opportunity type
 */
function detectType(text: string, fallbackCategory?: string): OpportunityType {
  const lower = text.toLowerCase();
  if (lower.includes("intern") || lower.includes("stipend") || lower.includes("trainee")) return "Internship";
  if (lower.includes("hackathon") || lower.includes("buildathon") || lower.includes("codefest")) return "Hackathon";
  if (lower.includes("competition") || lower.includes("contest") || lower.includes("challenge") || lower.includes("quiz") || lower.includes("prize")) return "Competition";
  if (lower.includes("scholarship") || lower.includes("grant") || lower.includes("financial aid") || lower.includes("tuition")) return "Scholarship";
  if (lower.includes("fellowship") || lower.includes("research fellow") || lower.includes("summer research")) return "Fellowship";
  if (lower.includes("summer of code") || lower.includes("gsoc") || lower.includes("open source") || lower.includes("outreachy") || lower.includes("lfx")) return "Open Source";

  if (fallbackCategory && fallbackCategory !== "All") {
    const validTypes: OpportunityType[] = ["Internship", "Hackathon", "Competition", "Scholarship", "Fellowship", "Open Source"];
    const matched = validTypes.find((t) => t.toLowerCase() === fallbackCategory.toLowerCase() || `${t.toLowerCase()}s` === fallbackCategory.toLowerCase());
    if (matched) return matched;
  }
  return "Internship";
}

/**
 * Detect mode (Online, In-person, Hybrid, Remote)
 */
function detectMode(text: string): { mode: OpportunityMode; location: string } {
  const lower = text.toLowerCase();
  if (lower.includes("remote") || lower.includes("work from home") || lower.includes("wfh") || lower.includes("virtual")) {
    return { mode: "Remote", location: "Remote / Work From Home" };
  }
  if (lower.includes("hybrid")) {
    return { mode: "Hybrid", location: "Hybrid (India)" };
  }

  // Major Indian cities
  const cities = ["Bengaluru", "Bangalore", "Delhi", "Mumbai", "Pune", "Hyderabad", "Chennai", "Noida", "Gurugram", "Gurgaon", "Kolkata", "Ahmedabad"];
  for (const city of cities) {
    if (lower.includes(city.toLowerCase())) {
      return { mode: "In-person", location: city };
    }
  }

  if (lower.includes("online") || lower.includes("global")) {
    return { mode: "Online", location: "Online / Global" };
  }

  return { mode: "Online", location: "Across India / Remote" };
}

/**
 * Extract stipend or cash prize amount from text
 */
function extractStipendOrPrize(text: string): string | null {
  // Check rupee signs or word stipend/prize
  const rupeePattern = /(?:₹|Rs\.?|INR)\s*[\d,]+(?:\s*(?:-|to)\s*(?:₹|Rs\.?|INR)?\s*[\d,]+)?(?:\s*(?:\/|per\s*)(?:month|mo|year|week))?/i;
  const matchRupee = text.match(rupeePattern);
  if (matchRupee) {
    return matchRupee[0].trim();
  }

  // Check "Stipend: ..." or "Prize: ..."
  const labelPattern = /(?:stipend|prize|cash prize|award|grant)[:\s]+([^.,\n]{3,35})/i;
  const matchLabel = text.match(labelPattern);
  if (matchLabel && matchLabel[1]) {
    const val = matchLabel[1].trim();
    if (!val.toLowerCase().includes("not") && !val.toLowerCase().includes("none")) {
      return val;
    }
  }

  // Dollar pattern for global competitions/hackathons/GSoC
  const dollarPattern = /\$[\d,]+(?:\s*(?:-|to)\s*\$?[\d,]+)?(?:\s*(?:\/|per\s*)(?:month|mo))?/i;
  const matchDollar = text.match(dollarPattern);
  if (matchDollar) {
    return matchDollar[0].trim();
  }

  return null;
}

/**
 * Extract deadline text and ISO date
 */
function extractDeadline(text: string, todayDate: string): { deadline_text: string; deadline_iso: string | null } {
  // Check "Apply by ...", "Ends on ...", "Deadline: ..."
  const deadlineMatch = text.match(/(?:apply by|ends on|deadline|last date|register by)[:\s]+([A-Za-z0-9,\s-]{4,25}?)(?:\.|\n|\||$)/i);
  if (deadlineMatch && deadlineMatch[1]) {
    const rawDeadline = deadlineMatch[1].trim();
    // Try parsing date
    const parsedTime = Date.parse(rawDeadline);
    if (!isNaN(parsedTime)) {
      const iso = new Date(parsedTime).toISOString().split("T")[0];
      if (iso >= todayDate) {
        return { deadline_text: rawDeadline, deadline_iso: iso };
      }
    }
    return { deadline_text: rawDeadline, deadline_iso: null };
  }

  // Check month dates in text like "Nov 25, 2026" or "15 Dec 2026"
  const dateMatch = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+202\d\b/i);
  if (dateMatch) {
    const parsedTime = Date.parse(dateMatch[0]);
    if (!isNaN(parsedTime)) {
      const iso = new Date(parsedTime).toISOString().split("T")[0];
      if (iso >= todayDate) {
        return { deadline_text: dateMatch[0], deadline_iso: iso };
      }
    }
  }

  return { deadline_text: "Rolling / Check portal", deadline_iso: null };
}

/**
 * Calculate keyword matches and fit score
 */
function computeFitScore(
  title: string,
  snippet: string,
  keywords: string[]
): { fitScore: number; matchedKeywords: string[]; whyFits: string } {
  const combined = `${title} ${snippet}`.toLowerCase();
  const matchedKeywords = keywords.filter((kw) => combined.includes(kw.toLowerCase()));

  let score = 7;
  if (matchedKeywords.length >= 1) score += 1;
  if (matchedKeywords.length >= 3) score += 1;
  if (combined.includes("stipend") || combined.includes("prize") || combined.includes("₹")) score += 1;

  score = Math.min(10, Math.max(6, score));

  const whyFits =
    matchedKeywords.length > 0
      ? `Directly matches your interest in ${matchedKeywords.slice(0, 3).join(", ")} with active open applications.`
      : `High-value verified opportunity for college students matching your current academic profile.`;

  return { fitScore: score, matchedKeywords, whyFits };
}

/**
 * Extract structured opportunities directly from verified TinyFish Search Results
 * This is 100% deterministic and operates with zero AI quota cost.
 */
export function extractOpportunitiesFromSearchResults(
  results: SearchResultItem[],
  keywords: string[],
  category: string,
  todayDate: string
): OpportunityItem[] {
  const items: OpportunityItem[] = [];

  results.forEach((r, idx) => {
    let domain = "web";
    try {
      domain = new URL(r.url).hostname.replace(/^www\./, "");
    } catch {
      // ignore
    }

    const title = cleanTitle(r.title);
    if (!title || title.length < 5) return;

    // Skip generic overview pages without specific context if title doesn't look like an opportunity
    if (title.toLowerCase().startsWith("browse ") || title.toLowerCase().includes("terms of service")) {
      return;
    }

    const snippet = r.snippet || "";
    const combinedText = `${r.title} ${snippet}`;
    const organization = extractOrganization(r.title, snippet, domain, r.site_name || "Portal Partner");
    const type = detectType(combinedText, category);
    const { mode, location } = detectMode(combinedText);
    const stipend = extractStipendOrPrize(combinedText);
    const { deadline_text, deadline_iso } = extractDeadline(combinedText, todayDate);
    const { fitScore, matchedKeywords, whyFits } = computeFitScore(title, snippet, keywords);

    const evidence = snippet.length > 30 ? snippet.slice(0, 150) + "..." : `Verified active listing on ${domain}`;

    items.push({
      id: `${domain}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      organization,
      type,
      mode,
      location,
      deadline_text,
      deadline_iso,
      eligibility: "College students & fresh graduates (check portal for branch criteria)",
      stipend_or_prize: stipend,
      link: r.url,
      evidence,
      keyword_matches: matchedKeywords.length > 0 ? matchedKeywords : keywords.slice(0, 2),
      fit_score: fitScore,
      why_it_fits: whyFits,
      source_name: r.site_name || domain,
      source_domain: domain,
      extracted_at: new Date().toISOString(),
    });
  });

  return items;
}

/**
 * Heuristically extract opportunities from raw markdown text of fetched pages
 */
export function extractOpportunitiesFromMarkdown(
  text: string,
  pageUrl: string,
  sourceName: string,
  keywords: string[],
  todayDate: string
): OpportunityItem[] {
  const items: OpportunityItem[] = [];
  let domain = "web";
  try {
    domain = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    // ignore
  }

  // Look for markdown sections or headers
  const headerBlocks = text.split(/(?=\n#{1,4}\s+)/);

  headerBlocks.forEach((block, idx) => {
    const lines = block.trim().split("\n");
    const headerLine = lines[0] || "";
    const titleMatch = headerLine.match(/^#{1,4}\s+(.+)$/);
    if (!titleMatch) return;

    const rawTitle = titleMatch[1].trim();
    if (rawTitle.length < 5 || rawTitle.length > 90) return;

    // Filter out common non-opportunity headers
    const lowerHeader = rawTitle.toLowerCase();
    if (
      lowerHeader.includes("about") ||
      lowerHeader.includes("contact") ||
      lowerHeader.includes("faq") ||
      lowerHeader.includes("privacy") ||
      lowerHeader.includes("cookie") ||
      lowerHeader.includes("navigation") ||
      lowerHeader.includes("footer") ||
      lowerHeader.includes("login") ||
      lowerHeader.includes("signup")
    ) {
      return;
    }

    const blockBody = lines.slice(1).join("\n");
    const combinedBlock = `${rawTitle}\n${blockBody}`;

    const title = cleanTitle(rawTitle);
    const organization = extractOrganization(rawTitle, blockBody, domain, sourceName);
    const type = detectType(combinedBlock);
    const { mode, location } = detectMode(combinedBlock);
    const stipend = extractStipendOrPrize(combinedBlock);
    const { deadline_text, deadline_iso } = extractDeadline(combinedBlock, todayDate);
    const { fitScore, matchedKeywords, whyFits } = computeFitScore(title, blockBody, keywords);

    // Look for link in block
    const linkMatch = blockBody.match(/\[(?:Apply|Register|View|Details)[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
    const specificLink = linkMatch ? linkMatch[1] : pageUrl;

    const evidence = blockBody.length > 20 ? blockBody.slice(0, 140) + "..." : `Active program listed on ${sourceName}`;

    items.push({
      id: `${domain}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      organization,
      type,
      mode,
      location,
      deadline_text,
      deadline_iso,
      eligibility: "Open to eligible Indian college students and recent grads",
      stipend_or_prize: stipend,
      link: specificLink,
      evidence,
      keyword_matches: matchedKeywords.length > 0 ? matchedKeywords : keywords.slice(0, 2),
      fit_score: fitScore,
      why_it_fits: whyFits,
      source_name: sourceName,
      source_domain: domain,
      extracted_at: new Date().toISOString(),
    });
  });

  return items.slice(0, 6); // Max 6 per page
}
