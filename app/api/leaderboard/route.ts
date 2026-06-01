import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getFriendsList } from "@/lib/services/social";
import { unstable_cache } from "next/cache";

const getCachedGlobalRankings = unstable_cache(
  async (sortBy: "xp" | "streak") => {
    const orderByField = sortBy === "streak" ? { currentStreak: "desc" as const } : { totalXp: "desc" as const };
    return await db.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        avatarUrl: true,
        currentStreak: true,
        totalXp: true,
      },
      orderBy: orderByField,
      take: 50,
    });
  },
  ["global-leaderboard-v2"],
  { revalidate: 60, tags: ["leaderboard"] }
);

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "global"; // "global" or "friends"
    const sortBy = searchParams.get("sortBy") === "streak" ? "streak" : "xp";

    if (filter === "friends") {
      // 1. Fetch user's friends list
      const friends = await getFriendsList(user.id);
      
      // Include current user in friends ranking
      const me = await db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          currentStreak: true,
          totalXp: true,
        },
      });

      const rankingList = [...friends];
      if (me) rankingList.push(me);

      // Sort ranking list programmatically
      rankingList.sort((a, b) => {
        if (sortBy === "streak") {
          return b.currentStreak - a.currentStreak;
        }
        return b.totalXp - a.totalXp;
      });

      return NextResponse.json({ rankings: rankingList });
    }

    // 2. Fetch global rankings (top 50) using cache
    const rankings = await getCachedGlobalRankings(sortBy);

    return NextResponse.json({ rankings });
  } catch (error: any) {
    console.error("Error in /api/leaderboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load rankings." },
      { status: 500 }
    );
  }
}

