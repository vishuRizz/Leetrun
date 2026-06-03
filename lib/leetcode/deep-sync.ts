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
    throw new Error(
      "No solved problems found for this account. Make sure you're logged into the correct LeetCode profile."
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
