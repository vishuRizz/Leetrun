import { db } from "@/lib/db";

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      stats: true,
      badges: true,
    },
  });

  if (!user) return [];

  // Map favorite series to standard DB prefix key
  const rawSeries = user.favoriteSeries || "NARUTO";
  const seriesPrefix = rawSeries.toUpperCase().replace(/\s+/g, "_");

  const unlockedBadgeIds = new Set(user.badges.map((ub) => ub.badgeId));
  const newBadgesAwarded: string[] = [];

  const checkBadge = async (badgeId: string, condition: boolean) => {
    if (condition && !unlockedBadgeIds.has(badgeId)) {
      try {
        await db.userBadge.create({
          data: {
            userId,
            badgeId,
          },
        });
        newBadgesAwarded.push(badgeId);
      } catch (err) {
        console.error(`Failed to award badge ${badgeId} to user ${userId}:`, err);
      }
    }
  };

  // 1. Streak Milestones (Noob Characters)
  await checkBadge(`${seriesPrefix}_streak_3`, user.currentStreak >= 3);
  await checkBadge(`${seriesPrefix}_streak_7`, user.currentStreak >= 7);

  // 2. Problem Solved Milestones (Supporting -> Protagonists)
  if (user.stats) {
    await checkBadge(`${seriesPrefix}_solved_10`, user.stats.totalSolved >= 10);
    await checkBadge(`${seriesPrefix}_solved_100`, user.stats.totalSolved >= 100);
  }

  // 3. Social Friends Count Milestones
  const friendsCount = await db.friendship.count({
    where: {
      OR: [
        { requesterId: userId, accepted: true },
        { receiverId: userId, accepted: true },
      ],
    },
  });
  await checkBadge(`${seriesPrefix}_friends_5`, friendsCount >= 5);

  // 4. Challenge Lobby Memberships (Guides / Icons)
  const roomMembershipsCount = await db.roomMember.count({
    where: { userId },
  });
  await checkBadge(`${seriesPrefix}_lobbyist`, roomMembershipsCount >= 1);

  return newBadgesAwarded;
}
