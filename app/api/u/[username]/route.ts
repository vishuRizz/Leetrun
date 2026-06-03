import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUsername, findUserBySlug } from "@/lib/services/username";

/**
 * Public profile snapshot for /<username>.
 *
 * Intentionally read-only and unauthenticated - anyone can view it.
 * Returns the same shape the public profile page renders, hiding private
 * bits (email, internal IDs, OTPs, billing).
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawSlug } = await ctx.params;
    const slug = decodeURIComponent(rawSlug || "").toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "Missing username." }, { status: 400 });
    }

    const user = await findUserBySlug(slug);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const username = await ensureUsername({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
    });

    // Fan-out the read in parallel. Public-safe selects only.
    const [stats, leetcode, badges] = await Promise.all([
      db.userStats.findUnique({ where: { userId: user.id } }),
      db.leetcodeProfile.findUnique({
        where: { userId: user.id },
        include: {
          languageStats: { orderBy: { solved: "desc" } },
          submissions: { orderBy: { submittedAt: "desc" }, take: 10 },
        },
      }),
      db.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: true },
        orderBy: { unlockedAt: "desc" },
      }),
    ]);

    const totalSolved =
      stats?.totalSolved ??
      leetcode?.totalSolved ??
      (leetcode
        ? (leetcode.easySolved ?? 0) +
          (leetcode.mediumSolved ?? 0) +
          (leetcode.hardSolved ?? 0)
        : 0);

    const level = Math.floor((user.totalXp || 0) / 100) + 1;
    const xpIntoLevel = (user.totalXp || 0) % 100;

    const payload = {
      success: true,
      profile: {
        username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        collegeName: user.collegeName,
        targetCompany: user.targetCompany,
        plan: user.plan,
        memberSince: user.createdAt,
        progression: {
          level,
          totalXp: user.totalXp || 0,
          xpIntoLevel,
          currentStreak: user.currentStreak || 0,
          longestStreak: user.longestStreak || 0,
        },
        stats: stats
          ? {
              totalSolved,
              easySolved: stats.easySolved ?? leetcode?.easySolved ?? 0,
              mediumSolved: stats.mediumSolved ?? leetcode?.mediumSolved ?? 0,
              hardSolved: stats.hardSolved ?? leetcode?.hardSolved ?? 0,
              strongestTopic: stats.strongestTopic,
              weakestTopic: stats.weakestTopic,
              consistencyScore: stats.consistencyScore ?? 0,
            }
          : null,
        leetcode: leetcode
          ? {
              username: leetcode.username,
              ranking: leetcode.ranking,
              reputation: leetcode.reputation,
              contestRating: leetcode.contestRating,
              totalSolved: leetcode.totalSolved,
              easySolved: leetcode.easySolved,
              mediumSolved: leetcode.mediumSolved,
              hardSolved: leetcode.hardSolved,
              acceptanceRate: leetcode.acceptanceRate,
              syncedAt: leetcode.syncedAt,
              languageStats: leetcode.languageStats.map((l) => ({
                id: l.id,
                language: l.language,
                solved: l.solved,
              })),
              submissions: leetcode.submissions.map((s) => ({
                id: s.id,
                title: s.title,
                slug: s.slug,
                difficulty: s.difficulty,
                topic: s.topic,
                submittedAt: s.submittedAt,
              })),
            }
          : null,
        badges: badges.map((b) => ({
          id: b.id,
          unlockedAt: b.unlockedAt,
          badge: {
            title: b.badge.title,
            description: b.badge.description,
            icon: b.badge.icon,
            type: b.badge.type,
          },
        })),
      },
    };

    const res = NextResponse.json(payload);
    // Public pages benefit from edge caching. Keep TTL short so renames /
    // avatar updates propagate quickly.
    res.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error: any) {
    console.error("Error in /api/u/[username] GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load public profile." },
      { status: 500 }
    );
  }
}
