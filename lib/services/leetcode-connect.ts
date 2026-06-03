/**
 * Connect or update a user's LeetCode account from profile (post-onboarding).
 *
 * Runs the same downstream effects as onboarding would have if the user had
 * linked LeetCode there: full sync, XP recalculation, level calibration,
 * preferred-difficulty update, and personalized quest generation when the
 * account is linked for the first time.
 */
import { db } from "@/lib/db";
import { syncUserProfile } from "@/lib/leetcode/service";
import {
  generateDailyChallenge,
  generateWeeklyChallenge,
  generateRevisionChallenge,
} from "@/lib/services/challenge";
import { ChallengeStatus, ChallengeType, Difficulty, UserLevel } from "@prisma/client";

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

function calibrateLevel(totalSolved: number): UserLevel {
  if (totalSolved >= 300) return UserLevel.ADVANCED;
  if (totalSolved >= 100) return UserLevel.INTERMEDIATE;
  return UserLevel.BEGINNER;
}

function difficultyForLevel(level: UserLevel): Difficulty {
  if (level === UserLevel.ADVANCED) return Difficulty.HARD;
  if (level === UserLevel.INTERMEDIATE) return Difficulty.MEDIUM;
  return Difficulty.EASY;
}

async function ensurePersonalizedQuests(userId: string) {
  const types: ChallengeType[] = [
    ChallengeType.DAILY,
    ChallengeType.WEEKLY,
    ChallengeType.REVISION,
  ];

  for (const type of types) {
    const active = await db.userChallenge.findFirst({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        challenge: { type },
      },
    });
    if (active) continue;

    if (type === ChallengeType.DAILY) {
      await generateDailyChallenge(userId);
    } else if (type === ChallengeType.WEEKLY) {
      await generateWeeklyChallenge(userId);
    } else {
      await generateRevisionChallenge(userId);
    }
  }
}

/** Retire the generic onboarding placeholder quest so personalized ones can take over. */
async function retireWarmUpQuest(userId: string) {
  const warmUp = await db.userChallenge.findFirst({
    where: {
      userId,
      status: ChallengeStatus.ACTIVE,
      challenge: { title: "Warm Up Quest", type: ChallengeType.DAILY },
    },
  });
  if (!warmUp) return;

  await db.userChallenge.update({
    where: { id: warmUp.id },
    data: { status: ChallengeStatus.FAILED },
  });
}

export async function connectOrUpdateLeetCodeAccount(
  userId: string,
  rawUsername: string
) {
  const username = normalizeUsername(rawUsername);
  if (!username) {
    throw new Error("LeetCode username is required.");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new Error(
      "Invalid LeetCode username. Use only letters, numbers, dashes and underscores."
    );
  }

  const existingForUser = await db.leetcodeProfile.findUnique({
    where: { userId },
  });
  const isFirstConnect = !existingForUser;

  // LeetCode usernames are globally unique in our DB - block hijacking another account.
  const takenByOther = await db.leetcodeProfile.findFirst({
    where: {
      username,
      NOT: { userId },
    },
    select: { userId: true },
  });
  if (takenByOther) {
    throw new Error(
      "That LeetCode username is already linked to another LeetRun account."
    );
  }

  // Full sync: stats, submissions, topics, badges, XP recalculation.
  const profile = await syncUserProfile(userId, username, { force: true });

  const totalSolved = profile.totalSolved || 0;
  const calibratedLevel = calibrateLevel(totalSolved);
  const preferredDifficulty = difficultyForLevel(calibratedLevel);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { level: calibratedLevel },
    });

    await tx.userPreference.upsert({
      where: { userId },
      update: { preferredDifficulty },
      create: { userId, preferredDifficulty },
    });

    await tx.userEvent.create({
      data: {
        userId,
        eventType: isFirstConnect
          ? "LEETCODE_CONNECTED"
          : "LEETCODE_USERNAME_UPDATED",
        metadata: {
          username,
          totalSolved,
          calibratedLevel,
          preferredDifficulty,
        },
      },
    });
  });

  if (isFirstConnect) {
    await retireWarmUpQuest(userId);
    await ensurePersonalizedQuests(userId);
  }

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { totalXp: true, level: true, coins: true },
  });

  return {
    profile,
    isFirstConnect,
    calibratedLevel,
    preferredDifficulty,
    totalXp: updatedUser?.totalXp ?? 0,
    level: updatedUser?.level ?? calibratedLevel,
  };
}
