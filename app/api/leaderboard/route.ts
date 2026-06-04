import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getFriendsList } from "@/lib/services/social";
import { unstable_cache } from "next/cache";

/**
 * Valid sort axes for the leaderboard. We keep them as a closed enum so the
 * UI and the API can't drift apart and we can hard-fail on bogus values.
 */
const SORT_KEYS = [
  "xp",       // total LeetRun XP earned in-app
  "level",    // alias of XP for display purposes
  "streak",   // current daily streak
  "total",    // total problems solved (UserStats → fallback LeetcodeProfile)
  "easy",
  "medium",
  "hard",
  "contest",  // LeetCode contest rating
] as const;
type SortKey = (typeof SORT_KEYS)[number];

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  username: true,
  avatarUrl: true,
  currentStreak: true,
  totalXp: true,
  stats: {
    select: {
      totalSolved: true,
      easySolved: true,
      mediumSolved: true,
      hardSolved: true,
    },
  },
  leetcodeProfile: {
    select: {
      username: true,
      contestRating: true,
      ranking: true,
      totalSolved: true,
      easySolved: true,
      mediumSolved: true,
      hardSolved: true,
    },
  },
} as const;

type UserRow = Awaited<ReturnType<typeof db.user.findMany<{ select: typeof USER_SELECT }>>>[number];

function metricFor(row: UserRow, sort: SortKey): number {
  switch (sort) {
    case "streak":
      return row.currentStreak || 0;
    case "total":
      return row.stats?.totalSolved ?? row.leetcodeProfile?.totalSolved ?? 0;
    case "easy":
      return row.stats?.easySolved ?? row.leetcodeProfile?.easySolved ?? 0;
    case "medium":
      return row.stats?.mediumSolved ?? row.leetcodeProfile?.mediumSolved ?? 0;
    case "hard":
      return row.stats?.hardSolved ?? row.leetcodeProfile?.hardSolved ?? 0;
    case "contest":
      return row.leetcodeProfile?.contestRating ?? 0;
    case "xp":
    case "level":
    default:
      return row.totalXp || 0;
  }
}

/**
 * The cached global leaderboard pre-fetches a generous candidate pool (top
 * 200 by XP) so we can sort them client-side by any axis without an extra
 * round-trip to the DB. The final response is trimmed to 50.
 */
const getCachedGlobalCandidates = unstable_cache(
  async () => {
    return await db.user.findMany({
      select: USER_SELECT,
      orderBy: { totalXp: "desc" },
      take: 200,
    });
  },
  ["global-leaderboard-candidates-v1"],
  { revalidate: 60, tags: ["leaderboard"] }
);

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "global";
    const requestedSort = (searchParams.get("sortBy") || "xp").toLowerCase();
    const sortBy: SortKey = (SORT_KEYS as readonly string[]).includes(requestedSort)
      ? (requestedSort as SortKey)
      : "xp";

    // The global leaderboard is public (great for marketing); only the
    // friends view requires a logged-in user.
    if (filter === "friends" && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rows: UserRow[];
    if (filter === "friends" && user) {
      const friends = await getFriendsList(user.id);
      const me = await db.user.findUnique({
        where: { id: user.id },
        select: USER_SELECT,
      });
      rows = [...friends];
      if (me) rows.push(me);
    } else {
      rows = await getCachedGlobalCandidates();
    }

    rows.sort((a, b) => metricFor(b, sortBy) - metricFor(a, sortBy));
    const rankings = rows.slice(0, 50);

    return NextResponse.json({
      rankings,
      sortBy,
      filter,
    });
  } catch (error: any) {
    console.error("Error in /api/leaderboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load rankings." },
      { status: 500 }
    );
  }
}
