import { PageFetchResult } from "./types";

interface CacheEntry {
  data: PageFetchResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedPage(url: string): PageFetchResult | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return null;
  }
  return entry.data;
}

export function setCachedPage(url: string, data: PageFetchResult): void {
  cache.set(url, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearCache(): void {
  cache.clear();
}
