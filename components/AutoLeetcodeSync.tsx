"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Broadcast when a background deep sync actually refreshed data. */
export const LEETCODE_SYNCED_EVENT = "leetrun:leetcode-synced";

// Client-side throttle: don't even hit the endpoint more than once per this
// window per browser. The server also self-throttles via the 6h DB timestamp,
// this just avoids spamming a request on every quick tab switch.
const CLIENT_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes
const STORE_KEY = "leetrun.autoDeepSync.lastTry";

/**
 * Invisible component. On mount it asks the server to refresh the user's
 * LeetCode deep sync if it's older than 6 hours (and a saved cookie exists).
 * When a sync actually happens, it refreshes the route and broadcasts an event
 * so client-rendered pages (e.g. Analytics) can reload their cached data.
 *
 * Mount it on data pages that benefit from fresh solves: Profile, Analytics,
 * Sheets.
 */
export default function AutoLeetcodeSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    try {
      const last = Number(localStorage.getItem(STORE_KEY) || 0);
      if (Date.now() - last < CLIENT_THROTTLE_MS) return;
      localStorage.setItem(STORE_KEY, String(Date.now()));
    } catch {
      /* localStorage unavailable - proceed anyway */
    }

    (async () => {
      try {
        const res = await fetch("/api/leetcode/auto-sync", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.synced) return;

        // Fresh data landed - refresh server components and tell client pages.
        window.dispatchEvent(new Event(LEETCODE_SYNCED_EVENT));
        router.refresh();
      } catch {
        /* silent - this is a best-effort background refresh */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
