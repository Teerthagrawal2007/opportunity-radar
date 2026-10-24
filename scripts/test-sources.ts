import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local first, fallback to .env
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
  console.log(`Loaded environment from: .env.local`);
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
  console.log(`Loaded environment from: .env`);
} else {
  console.warn("Warning: Neither .env.local nor .env was found. Using current process.env.");
}

import { TRUSTED_SOURCES } from "../config/sources";

const TINYFISH_FETCH_URL = "https://api.fetch.tinyfish.ai";

interface SourceTestResult {
  Name: string;
  Category: string;
  Status: "OK" | "THIN" | "FAILED";
  "Chars Returned": number;
  "First 120 Chars": string;
}

async function testAllSources() {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.error("\n❌ ERROR: TINYFISH_API_KEY is not defined in your environment or .env.local file!");
    console.error("Please add TINYFISH_API_KEY=your_key to .env.local and retry.\n");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`   Opportunity Radar - Testing All 20 Trusted Sources `);
  console.log(`======================================================\n`);
  console.log(`Total sources to test: ${TRUSTED_SOURCES.length}`);
  console.log(`Endpoint: ${TINYFISH_FETCH_URL}`);
  console.log(`Fetch batch size: max 10 URLs per request (as per TinyFish specification)\n`);

  const results: SourceTestResult[] = [];
  const allUrls = TRUSTED_SOURCES.map((s) => s.url);

  // Split into batches of 10
  const BATCH_SIZE = 10;
  const batches: string[][] = [];
  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    batches.push(allUrls.slice(i, i + BATCH_SIZE));
  }

  const fetchedDataMap = new Map<string, { text: string; status: "OK" | "THIN" | "FAILED" }>();

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(`[Batch ${b + 1}/${batches.length}] Fetching ${batch.length} URLs...`);

    try {
      const response = await fetch(TINYFISH_FETCH_URL, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: batch }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Batch ${b + 1} failed with HTTP ${response.status}: ${errorText}`);
        batch.forEach((url) => {
          fetchedDataMap.set(url, { text: "", status: "FAILED" });
        });
        continue;
      }

      const json = (await response.json()) as {
        results?: Array<{ url: string; text?: string }>;
        errors?: Array<string | { url: string }>;
      };

      // Process results
      if (Array.isArray(json.results)) {
        for (const item of json.results) {
          const text = (item.text || "").trim();
          const charCount = text.length;
          const status = charCount >= 500 ? "OK" : "THIN";
          fetchedDataMap.set(item.url, { text, status });
        }
      }

      // Process errors array
      if (Array.isArray(json.errors)) {
        for (const errItem of json.errors) {
          const failedUrl = typeof errItem === "string" ? errItem : errItem.url;
          if (failedUrl) {
            fetchedDataMap.set(failedUrl, { text: "", status: "FAILED" });
          }
        }
      }

      // Any remaining URLs in batch
      batch.forEach((url) => {
        if (!fetchedDataMap.has(url)) {
          fetchedDataMap.set(url, { text: "", status: "FAILED" });
        }
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Network error for batch ${b + 1}:`, errorMsg);
      batch.forEach((url) => {
        fetchedDataMap.set(url, { text: "", status: "FAILED" });
      });
    }
  }

  // Populate formatted results
  for (const source of TRUSTED_SOURCES) {
    const data = fetchedDataMap.get(source.url) || { text: "", status: "FAILED" };
    const charCount = data.text.length;
    const cleanSnippet = data.text
      .replace(/\s+/g, " ")
      .slice(0, 120);

    results.push({
      Name: source.name,
      Category: source.category,
      Status: data.status,
      "Chars Returned": charCount,
      "First 120 Chars": cleanSnippet || (data.status === "FAILED" ? "[Fetch Error / Blocked]" : "[Empty]"),
    });
  }

  console.log("\n======================== RESULTS TABLE ========================\n");
  console.table(results);

  const okCount = results.filter((r) => r.Status === "OK").length;
  const thinCount = results.filter((r) => r.Status === "THIN").length;
  const failedCount = results.filter((r) => r.Status === "FAILED").length;

  console.log("\n======================= SUMMARY SUMMARY =======================");
  console.log(`✅ OK (>= 500 chars):     ${okCount} / ${TRUSTED_SOURCES.length}`);
  console.log(`⚠️  THIN (< 500 chars):    ${thinCount} / ${TRUSTED_SOURCES.length} (JS-heavy sites often require browser rendering)`);
  console.log(`❌ FAILED:                ${failedCount} / ${TRUSTED_SOURCES.length}`);
  console.log("===============================================================\n");
  console.log("Note: Sources marked 'jsHeavy' in config/sources.ts rely heavily on client-side React/SPA rendering.");
  console.log("In future iterations, these can be targeted via TinyFish Agent API or Browser API.\n");
}

testAllSources().catch((err: unknown) => {
  console.error("Fatal test-sources failure:", err);
  process.exit(1);
});
