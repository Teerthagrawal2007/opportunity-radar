import { SearchResultItem, PageFetchResult } from "./types";
import { getCachedPage, setCachedPage } from "./cache";

const TINYFISH_SEARCH_URL = "https://api.search.tinyfish.ai";
const TINYFISH_FETCH_URL = "https://api.fetch.tinyfish.ai";

// Concurrency limiter: max 4 parallel TinyFish requests
class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: Array<() => void> = [];
  private readonly maxConcurrency: number;

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = maxConcurrency;
  }

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

const limiter = new ConcurrencyLimiter(4);
let hasLoggedFirstSearch = false;

export class TinyFishError extends Error {
  statusCode?: number;
  friendlyMessage: string;

  constructor(statusCode: number | undefined, rawMessage: string) {
    let friendly = "Couldn't reach TinyFish";
    if (statusCode === 401) {
      friendly = "Your API key looks wrong";
    } else if (statusCode === 429) {
      friendly = "Too many requests, wait a minute";
    } else if (statusCode === 402) {
      friendly = "Daily free limit reached";
    } else if (statusCode && statusCode >= 500) {
      friendly = "TinyFish service is temporarily unavailable. Please retry in a moment.";
    } else if (rawMessage) {
      friendly = rawMessage;
    }
    super(friendly);
    this.name = "TinyFishError";
    this.statusCode = statusCode;
    this.friendlyMessage = friendly;
  }
}

function getApiKey(): string {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) {
    throw new TinyFishError(401, "TINYFISH_API_KEY is not configured in .env.local");
  }
  return key;
}

// Helper to execute a fetch with timeout and 1 retry on 429 after 3 seconds
async function requestWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  attempt: number = 1
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // If 429 and first attempt, wait 3 seconds and retry once
    if (response.status === 429 && attempt === 1) {
      console.warn(`[TinyFish] Received 429 Rate Limit for ${url}. Waiting 3s before retry...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await requestWithRetry(url, options, timeoutMs, attempt + 1);
    }

    if (!response.ok) {
      let errText = "";
      try {
        errText = await response.text();
      } catch {
        // ignore
      }
      console.error(`[TinyFish] Error ${response.status} from ${url}: ${errText}`);
      throw new TinyFishError(response.status, errText);
    }

    return response;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof TinyFishError) throw err;
    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === "AbortError") {
      console.error(`[TinyFish] Request timed out after ${timeoutMs}ms for ${url}`);
      throw new TinyFishError(undefined, `Timeout after ${timeoutMs}ms`);
    }
    console.error(`[TinyFish] Network error for ${url}:`, errorObj?.message || String(err));
    throw new TinyFishError(undefined, errorObj?.message || "Network error");
  }
}

export interface SearchOptions {
  query: string;
  location?: string;
  language?: string;
  after_date?: string;
  include_domains?: string;
  exclude_domains?: string;
}

export async function searchOpportunities(
  opts: SearchOptions
): Promise<SearchResultItem[]> {
  return limiter.run(async () => {
    const apiKey = getApiKey();
    const params = new URLSearchParams();
    params.set("query", opts.query);
    params.set("location", opts.location || "IN");
    params.set("language", opts.language || "en");
    if (opts.after_date) {
      params.set("after_date", opts.after_date);
    }
    if (opts.include_domains) {
      params.set("include_domains", opts.include_domains);
    }
    if (opts.exclude_domains) {
      params.set("exclude_domains", opts.exclude_domains);
    }

    const requestUrl = `${TINYFISH_SEARCH_URL}?${params.toString()}`;
    console.log(`[TinyFish Search] Query: "${opts.query}" | include: ${opts.include_domains || "none"} | exclude: ${opts.exclude_domains || "none"}`);

    const response = await requestWithRetry(
      requestUrl,
      {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
        },
      },
      15000 // 15s timeout
    );

    const json = (await response.json()) as { results?: Array<Record<string, unknown>> };

    if (!hasLoggedFirstSearch) {
      hasLoggedFirstSearch = true;
      console.log("[TinyFish Search] RAW RESPONSE OF FIRST CALL:", JSON.stringify(json, null, 2));
    }

    const results: SearchResultItem[] = (json.results || []).map((r, idx: number) => ({
      position: typeof r.position === "number" ? r.position : idx + 1,
      title: typeof r.title === "string" ? r.title : "Untitled",
      snippet: typeof r.snippet === "string" ? r.snippet : "",
      url: typeof r.url === "string" ? r.url : "",
      site_name: typeof r.site_name === "string" ? r.site_name : "",
      date: typeof r.date === "string" ? r.date : undefined,
    }));

    console.log(`[TinyFish Search] Found ${results.length} results for "${opts.query}"`);
    return results;
  });
}

export async function fetchPages(
  urls: string[],
  onPageProgress?: (url: string, status: "ok" | "thin" | "failed", chars: number) => void
): Promise<Record<string, PageFetchResult>> {
  const results: Record<string, PageFetchResult> = {};
  const urlsToFetch: string[] = [];

  // Check cache first (30 min cache)
  for (const url of urls) {
    const cached = getCachedPage(url);
    if (cached) {
      console.log(`[TinyFish Fetch] Cache HIT for: ${url} (${cached.charCount} chars)`);
      results[url] = cached;
      if (onPageProgress) {
        onPageProgress(url, cached.status, cached.charCount);
      }
    } else {
      urlsToFetch.push(url);
    }
  }

  if (urlsToFetch.length === 0) {
    return results;
  }

  // Batch URLs in chunks of max 10
  const BATCH_SIZE = 10;
  const batches: string[][] = [];
  for (let i = 0; i < urlsToFetch.length; i += BATCH_SIZE) {
    batches.push(urlsToFetch.slice(i, i + BATCH_SIZE));
  }

  console.log(`[TinyFish Fetch] Fetching ${urlsToFetch.length} URLs in ${batches.length} batch(es)...`);

  for (const batch of batches) {
    await limiter.run(async () => {
      const apiKey = getApiKey();
      console.log(`[TinyFish Fetch] Sending batch of ${batch.length} URLs:`, batch);

      try {
        const response = await requestWithRetry(
          TINYFISH_FETCH_URL,
          {
            method: "POST",
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ urls: batch }),
          },
          150000 // 150s timeout as per spec
        );

        const data = (await response.json()) as {
          results?: Array<{ url: string; text?: string; title?: string }>;
          errors?: Array<string | { url: string }>;
        };

        // Process successful results
        if (Array.isArray(data.results)) {
          for (const item of data.results) {
            const pageUrl = item.url;
            const text = item.text || "";
            const title = item.title || "Opportunity Page";
            const charCount = text.length;
            const status: "ok" | "thin" | "failed" = charCount >= 500 ? "ok" : "thin";

            const pageResult: PageFetchResult = {
              url: pageUrl,
              title,
              text,
              status,
              charCount,
            };

            results[pageUrl] = pageResult;
            setCachedPage(pageUrl, pageResult);
            console.log(`[TinyFish Fetch] Processed ${pageUrl}: status=${status}, chars=${charCount}`);
            if (onPageProgress) {
              onPageProgress(pageUrl, status, charCount);
            }
          }
        }

        // Process errors array - failed URLs come back here: skip them, never crash!
        if (Array.isArray(data.errors)) {
          for (const errItem of data.errors) {
            const failedUrl = typeof errItem === "string" ? errItem : errItem.url;
            if (failedUrl) {
              const failedResult: PageFetchResult = {
                url: failedUrl,
                title: "Failed URL",
                text: "",
                status: "failed",
                charCount: 0,
              };
              results[failedUrl] = failedResult;
              console.warn(`[TinyFish Fetch] Skipped failed URL: ${failedUrl} (${JSON.stringify(errItem)})`);
              if (onPageProgress) {
                onPageProgress(failedUrl, "failed", 0);
              }
            }
          }
        }

        // If any URLs in the batch were missing from both results and errors, mark them failed
        for (const url of batch) {
          if (!results[url]) {
            const fallbackFailed: PageFetchResult = {
              url,
              title: "Failed URL",
              text: "",
              status: "failed",
              charCount: 0,
            };
            results[url] = fallbackFailed;
            if (onPageProgress) {
              onPageProgress(url, "failed", 0);
            }
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[TinyFish Fetch] Batch failed:`, errorMsg);
        // Mark all URLs in this batch as failed so pipeline continues gracefully
        for (const url of batch) {
          if (!results[url]) {
            const failedResult: PageFetchResult = {
              url,
              title: "Fetch Error",
              text: "",
              status: "failed",
              charCount: 0,
            };
            results[url] = failedResult;
            if (onPageProgress) {
              onPageProgress(url, "failed", 0);
            }
          }
        }
      }
    });
  }

  return results;
}
