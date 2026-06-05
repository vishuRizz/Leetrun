import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto/encrypt";
import {
  parseLeetcodeCookie,
} from "@/lib/leetcode/cookie";
import {
  fetchAllSolvedProblems,
  validateLeetcodeSession,
  type LeetcodeCookieAuth,
} from "@/lib/leetcode/graphql";
import { buildLeetcodeSlugIndex } from "@/lib/sheets";
import { syncUserProfile } from "@/lib/leetcode/service";
import type { Difficulty } from "@prisma/client";

export interface DeepSyncOptions {
  cookieRaw: string;
  saveCookie?: boolean;
  syncSheets?: boolean;
}

export interface DeepSyncResult {
  solvedCount: number;
  sheetMarked: number;
  deepSyncedAt: string;
  username: string;
}

function toDifficulty(raw: string): Difficulty {
  const d = raw.toLowerCase();
  if (d === "hard") return "HARD";
  if (d === "medium") return "MEDIUM";
  return "EASY";
}

function toAuth(parsed: ReturnType<typeof parseLeetcodeCookie>): LeetcodeCookieAuth {
  return {
    cookieHeader: parsed.cookieHeader,
    csrfToken: parsed.csrfToken,
  };
}

async function persistSolvedProblems(
  profileId: string,
  solved: Awaited<ReturnType<typeof fetchAllSolvedProblems>>
) {
  await db.leetcodeSolvedProblem.deleteMany({ where: { profileId } });

  const CHUNK = 400;
  for (let i = 0; i < solved.length; i += CHUNK) {
    const slice = solved.slice(i, i + CHUNK);
    await db.leetcodeSolvedProblem.createMany({
      data: slice.map((q) => ({
        profileId,
        title: q.title,
        titleSlug: q.titleSlug,
        difficulty: toDifficulty(q.difficulty),
        topics: q.topicSlugs.length ? q.topicSlugs.join(",") : null,
        acRate: q.acRate,
      })),
      skipDuplicates: true,
    });
  }
}

async function applySheetProgress(
  userId: string,
  solvedSlugs: Set<string>
): Promise<number> {
  const index = buildLeetcodeSlugIndex();
  const targets: { sheetSlug: string; problemKey: string }[] = [];

  for (const slug of solvedSlugs) {
    const refs = index.get(slug.toLowerCase());
    if (refs) targets.push(...refs);
  }

  if (targets.length === 0) return 0;

  const unique = new Map<string, { sheetSlug: string; problemKey: string }>();
  for (const t of targets) {
    unique.set(`${t.sheetSlug}:${t.problemKey}`, t);
  }

  const rows = Array.from(unique.values());
  const CHUNK = 500;
  let created = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await db.sheetProgress.createMany({
      data: slice.map((r) => ({
        userId,
        sheetSlug: r.sheetSlug,
        problemKey: r.problemKey,
      })),
      skipDuplicates: true,
    });
    created += result.count;
  }

  return created;
}

export async function getDeepSyncStatus(userId: string) {
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
    select: {
      username: true,
      deepSyncedAt: true,
      deepSyncCount: true,
      sessionCookieEnc: true,
      _count: { select: { solvedProblems: true } },
    },
  });

  if (!profile) {
    return {
      hasLeetcode: false as const,
      username: null,
      deepSyncedAt: null,
      deepSyncCount: 0,
      hasSavedCookie: false,
    };
  }

  return {
    hasLeetcode: true as const,
    username: profile.username,
    deepSyncedAt: profile.deepSyncedAt?.toISOString() ?? null,
    deepSyncCount: profile.deepSyncCount || profile._count.solvedProblems,
    hasSavedCookie: Boolean(profile.sessionCookieEnc),
  };
}

export async function runDeepLeetcodeSync(
  userId: string,
  options: DeepSyncOptions
): Promise<DeepSyncResult> {
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new Error(
      "Connect your LeetCode username first before running a deep sync."
    );
  }

  const parsed = parseLeetcodeCookie(options.cookieRaw);
  const auth = toAuth(parsed);

  const valid = await validateLeetcodeSession(auth);
  if (!valid) {
    throw new Error(
      "Invalid or expired LeetCode session. Log in at leetcode.com and copy a fresh cookie."
    );
  }

  const solved = await fetchAllSolvedProblems(auth);
  if (solved.length === 0) {
    // A session that *looks* valid but returns zero solved problems almost
    // always means the cookie is logged-out/expired - LeetCode quietly returns
    // an empty "AC" list instead of an auth error. Drop any stale saved cookie
    // so background auto-sync stops retrying, and ask for a fresh session.
    await clearSavedLeetcodeCookie(userId).catch(() => {});
    throw new Error(
      "Your LeetCode session has expired. Please paste a fresh session cookie and run the deep sync again."
    );
  }

  const slugSet = new Set(solved.map((q) => q.titleSlug.toLowerCase()));
  const now = new Date();

  await persistSolvedProblems(profile.id, solved);

  const updateData: {
    deepSyncedAt: Date;
    deepSyncCount: number;
    sessionCookieEnc?: string;
  } = {
    deepSyncedAt: now,
    deepSyncCount: solved.length,
  };

  if (options.saveCookie !== false) {
    updateData.sessionCookieEnc = encryptSecret(parsed.cookieHeader);
  }

  await db.leetcodeProfile.update({
    where: { id: profile.id },
    data: updateData,
  });

  let sheetMarked = 0;
  if (options.syncSheets !== false) {
    sheetMarked = await applySheetProgress(userId, slugSet);
  }

  // Refresh public stats / XP pipeline in the background-style call.
  await syncUserProfile(userId, profile.username, { force: true }).catch(
    (err) => {
      console.warn("Post deep-sync profile refresh failed:", err);
    }
  );

  await db.userEvent.create({
    data: {
      userId,
      eventType: "LEETCODE_DEEP_SYNC",
      metadata: {
        username: profile.username,
        solvedCount: solved.length,
        sheetMarked,
      },
    },
  });

  return {
    solvedCount: solved.length,
    sheetMarked,
    deepSyncedAt: now.toISOString(),
    username: profile.username,
  };
}

/** How stale a deep sync can be before we auto-refresh it in the background. */
export const AUTO_DEEP_SYNC_STALE_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-process guard so concurrent tab visits don't kick off duplicate deep syncs
// for the same user while one is already running.
const autoSyncInflight = new Set<string>();

export type AutoDeepSyncOutcome =
  | { synced: true; result: DeepSyncResult }
  | {
      synced: false;
      reason: "no-leetcode" | "no-cookie" | "fresh" | "in-progress" | "error";
      deepSyncedAt: string | null;
    };

/**
 * Background helper: if the user's deep sync is older than 6 hours (or never
 * happened) AND they have a saved session cookie, re-run it silently. No-ops
 * (returns a reason) when a sync isn't needed or possible. Safe to call on
 * every relevant page visit - it self-throttles via the DB timestamp.
 */
export async function maybeAutoDeepSync(
  userId: string
): Promise<AutoDeepSyncOutcome> {
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
    select: { deepSyncedAt: true, sessionCookieEnc: true },
  });

  if (!profile) {
    return { synced: false, reason: "no-leetcode", deepSyncedAt: null };
  }

  const deepSyncedAt = profile.deepSyncedAt?.toISOString() ?? null;

  if (!profile.sessionCookieEnc) {
    // Can't auto-sync without a saved cookie - the user must run a manual
    // deep sync once to grant us a session.
    return { synced: false, reason: "no-cookie", deepSyncedAt };
  }

  const isFresh =
    profile.deepSyncedAt &&
    Date.now() - profile.deepSyncedAt.getTime() < AUTO_DEEP_SYNC_STALE_MS;
  if (isFresh) {
    return { synced: false, reason: "fresh", deepSyncedAt };
  }

  if (autoSyncInflight.has(userId)) {
    return { synced: false, reason: "in-progress", deepSyncedAt };
  }

  autoSyncInflight.add(userId);
  try {
    const result = await rerunSavedDeepSync(userId, true);
    return { synced: true, result };
  } catch (err) {
    console.warn("Auto deep sync failed:", err);
    return { synced: false, reason: "error", deepSyncedAt };
  } finally {
    autoSyncInflight.delete(userId);
  }
}

/** Re-run deep sync using a previously saved encrypted cookie. */
export async function rerunSavedDeepSync(
  userId: string,
  syncSheets = true
): Promise<DeepSyncResult> {
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
    select: { sessionCookieEnc: true },
  });

  if (!profile?.sessionCookieEnc) {
    throw new Error("No saved LeetCode session. Paste your cookie again.");
  }

  const cookieHeader = decryptSecret(profile.sessionCookieEnc);
  return runDeepLeetcodeSync(userId, {
    cookieRaw: cookieHeader,
    saveCookie: true,
    syncSheets,
  });
}

export async function clearSavedLeetcodeCookie(userId: string) {
  await db.leetcodeProfile.updateMany({
    where: { userId },
    data: { sessionCookieEnc: null },
  });
}
