import { db } from "@/lib/db";
import { appDayKey, startOfPreviousAppDay } from "@/lib/utils/app-time";

/**
 * Dynamically recalculates the user's totalXp (Universal Competency Score)
 * using their solved distribution, contest ratings, acceptance rate, and quest completions.
 */
export async function recalculateUserUniversalPoints(userId: string, txClient?: any) {
  const prisma = txClient || db;

  // 1. Fetch user data with profiles, stats, challenges
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      leetcodeProfile: true,
      stats: true,
      userChallenges: {
        where: { status: "COMPLETED" },
        include: { challenge: true }
      }
    }
  });

  if (!user) return;

  const easy = user.leetcodeProfile?.easySolved || 0;
  const medium = user.leetcodeProfile?.mediumSolved || 0;
  const hard = user.leetcodeProfile?.hardSolved || 0;
  const rating = user.leetcodeProfile?.contestRating || 0;
  const acceptance = user.leetcodeProfile?.acceptanceRate || 0;
  const streak = user.currentStreak || 0;

  // Calculate detailed competency points
  const easyPoints = easy * 15;        // 15 points per easy
  const mediumPoints = medium * 40;    // 40 points per medium
  const hardPoints = hard * 120;       // 120 points per hard
  const ratingBonus = rating > 1000 ? Math.floor((rating - 1000) * 0.5) : 0; // Contest rating scaling
  const acceptanceBonus = Math.floor(acceptance * 2);                        // Acceptance accuracy weight
  const streakBonus = streak * 10;                                           // Consistency multiplier

  // Calculate platform challenges completed
  const challengesPoints = user.userChallenges.reduce((sum: number, uc: any) => {
    return sum + (uc.challenge?.xpReward || 0);
  }, 0);

  const totalPoints = easyPoints + mediumPoints + hardPoints + ratingBonus + acceptanceBonus + streakBonus + challengesPoints;

  // Update user's totalXp in database
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalXp: totalPoints
    }
  });

  // Log calculation for telemetry/audit
  await prisma.userEvent.create({
    data: {
      userId,
      eventType: "UNIVERSAL_POINTS_RECALCULATED",
      metadata: {
        easyPoints,
        mediumPoints,
        hardPoints,
        ratingBonus,
        acceptanceBonus,
        streakBonus,
        challengesPoints,
        totalPoints
      }
    }
  });

  return totalPoints;
}

export async function awardXp(userId: string, amount: number, reason: string) {
  return await db.$transaction(async (tx) => {
    // 1. Create XP log
    await tx.xPLog.create({
      data: {
        userId,
        amount,
        reason,
      },
    });

    // 2. Fetch current user totalXp
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, coins: true },
    });

    if (!user) throw new Error("User not found.");

    const oldLevel = Math.floor(user.totalXp / 100) + 1;

    // Recalculate universal points
    const newXp = await recalculateUserUniversalPoints(userId, tx) || (user.totalXp + amount);
    const newLevel = Math.floor(newXp / 100) + 1;

    let extraCoins = 0;
    // Award 20 coins for each level gained
    if (newLevel > oldLevel) {
      extraCoins = (newLevel - oldLevel) * 20;
    }

    // 3. Update User coins
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        coins: user.coins + extraCoins,
      },
    });

    // Log event for audit/analytics
    await tx.userEvent.create({
      data: {
        userId,
        eventType: "XP_AWARDED",
        metadata: {
          amount,
          reason,
          newTotalXp: newXp,
          levelUp: newLevel > oldLevel,
        },
      },
    });

    return { user: updatedUser, levelGained: newLevel > oldLevel };
  });
}

/**
 * Bump the user's streak for completing a quest today. Day-aware:
 * - Idempotent: at most one increment per app day (IST).
 * - Continues the streak if the previous increment was yesterday.
 * - Resets to 1 if a day (or more) was skipped, or it's the first ever.
 */
export async function incrementStreak(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastStreakAt: true },
  });

  if (!user) throw new Error("User not found.");

  const todayKey = appDayKey();

  // Already counted today - nothing to do.
  if (user.lastStreakAt && appDayKey(user.lastStreakAt) === todayKey) {
    return user;
  }

  const yesterdayKey = appDayKey(startOfPreviousAppDay());
  const continuing =
    user.lastStreakAt && appDayKey(user.lastStreakAt) === yesterdayKey;

  const nextStreak = continuing ? user.currentStreak + 1 : 1;
  const nextLongest = Math.max(user.longestStreak, nextStreak);

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      currentStreak: nextStreak,
      longestStreak: nextLongest,
      lastStreakAt: new Date(),
    },
  });

  // Re-calculate universal points to account for streak bonus change
  await recalculateUserUniversalPoints(userId);

  return updatedUser;
}

export async function breakStreak(userId: string) {
  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      currentStreak: 0,
    },
  });

  // Re-calculate universal points to account for streak bonus reset
  await recalculateUserUniversalPoints(userId);

  return updatedUser;
}
