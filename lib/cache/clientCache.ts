/**
 * Tiny client-side stale-while-revalidate cache backed by localStorage.
 *
 * The goal: when a user opens a data-heavy page (dashboard, analytics,
 * leaderboard) we render the LAST KNOWN data instantly from the browser, then
 * fetch fresh data in the background and swap it in silently. Unlike a plain
 * TTL cache we never *hide* stale data behind a skeleton - staleness only
 * matters for deciding whether to revalidate, never for what to display. This
 * makes navigation feel instant even on a cold network.
 *
 * localStorage (not sessionStorage) is used on purpose so the cache survives
 * full reloads and new tabs. Caches are namespaced and cleared on logout via
 * `clearClientCache()` so one user never sees another user's data.
 */

const PREFIX = "lr-cache:";

interface CacheEnvelope<T> {
  data: T;
  ts: number;
}

/** Read cached data for a key, or null if absent/unreadable. Never expires. */
export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    return (parsed?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Read cached data along with its write timestamp (for staleness checks). */
export function readCacheWithMeta<T>(
  key: string
): { data: T; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (parsed?.data == null || typeof parsed.ts !== "number") return null;
    return { data: parsed.data, ts: parsed.ts };
  } catch {
    return null;
  }
}

/** Persist data for a key. Silently no-ops on quota/private-mode errors. */
export function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope<T> = { data, ts: Date.now() };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    /* storage full / privacy mode - ignore */
  }
}

/** Remove a single cached key. */
export function removeCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Wipe every namespaced cache entry. Call this on logout. */
export function clearClientCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
