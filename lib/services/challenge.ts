import { db } from "@/lib/db";
import { awardXp, incrementStreak } from "./progression";
import { ChallengeType, ChallengeStatus, Difficulty } from "@prisma/client";
import questionBankData from "@/DSA Question Bank.json";

export interface BankQuestion {
  id: number;
  lcNumber: number;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic: string;
  tags: string[];
  isStriver: boolean;
  isBlind75: boolean;
  isNeetCode150: boolean;
  companies: string[];
  pattern: string;
  level: number;
  prereqs: string[];
}

const QUESTIONS = questionBankData.questions as BankQuestion[];

/**
 * Recommends personalized DSA problems based on user solved stats, target company, topics, and sheet curation.
 */
export function recommendQuestions(params: {
  solvedSlugs: Set<string>;
  targetDifficulty: Difficulty;
  targetCompany?: string | null;
  topic?: string | null;
  count: number;
  allowAlreadySolved?: boolean;
}): BankQuestion[] {
  const { solvedSlugs, targetDifficulty, targetCompany, topic, count, allowAlreadySolved = false } = params;

  // 1. Filter candidates
  let candidates = QUESTIONS.filter((q) => {
    // If not allowing solved, filter them out
    if (!allowAlreadySolved && solvedSlugs.has(q.slug)) {
      return false;
    }

    // Filter by topic if specified
    if (topic && q.topic.toLowerCase() !== topic.toLowerCase()) {
      return false;
    }

    // Check prerequisites: all prereqs must be solved
    if (q.prereqs && q.prereqs.length > 0) {
      const allPrereqsSolved = q.prereqs.every((p) => solvedSlugs.has(p));
      if (!allPrereqsSolved) return false;
    }

    return true;
  });

  // 2. Score and sort candidates
  const scored = candidates.map((q) => {
    let score = 0;

    // Matches target difficulty
    if (q.difficulty === targetDifficulty) {
      score += 100;
    }

    // Matches target company (case-insensitive)
    if (targetCompany && q.companies && q.companies.some((c) => c.toLowerCase().includes(targetCompany.toLowerCase()))) {
      score += 50;
    }

    // Curated sheet priority
    if (q.isBlind75) score += 20;
    if (q.isNeetCode150) score += 15;
    if (q.isStriver) score += 10;

    return { question: q, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, count).map((s) => s.question);

  // 3. Fallback: if we don't have enough questions, relax criteria
  if (selected.length < count) {
    const fallbackCandidates = QUESTIONS.filter((q) => {
      return !selected.some((s) => s.slug === q.slug);
    });

    const scoredFallbacks = fallbackCandidates.map((q) => {
      let score = 0;
      if (q.difficulty === targetDifficulty) score += 50;
      if (topic && q.topic.toLowerCase() === topic.toLowerCase()) score += 30;
      if (!solvedSlugs.has(q.slug)) score += 20;
      return { question: q, score };
    });

    scoredFallbacks.sort((a, b) => b.score - a.score);
    
    const needed = count - selected.length;
    selected.push(...scoredFallbacks.slice(0, needed).map((s) => s.question));
  }

  // Final sanity check: if list is still empty, grab any questions
  while (selected.length < count) {
    const fallback = QUESTIONS.find((q) => !selected.some((s) => s.slug === q.slug));
    if (fallback) {
      selected.push(fallback);
    } else {
      break;
    }
  }

  return selected;
}

export async function generateDailyChallenge(userId: string) {
  // 1. Fetch user parameters
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { preferences: true, leetcodeProfile: { include: { submissions: true } } },
  });

  if (!user) throw new Error("User not found.");

  const targetDifficulty = user.preferences?.preferredDifficulty || Difficulty.EASY;
  const targetCompany = user.targetCompany;

  // 2. Fetch already solved problem slugs
  const solvedSlugs = new Set<string>();
  if (user.leetcodeProfile) {
    user.leetcodeProfile.submissions.forEach((sub) => {
      solvedSlugs.add(sub.slug);
    });
  }

  // 3. Recommend questions
  const selected = recommendQuestions({
    solvedSlugs,
    targetDifficulty,
    targetCompany,
    count: 2,
  });

  // 4. Create the challenge in database
  return await db.$transaction(async (tx) => {
    // Mark previous daily challenges as FAILED if they weren't completed
    await tx.userChallenge.updateMany({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        challenge: {
          type: ChallengeType.DAILY,
        },
      },
      data: {
        status: ChallengeStatus.FAILED,
      },
    });

    const challenge = await tx.challenge.create({
      data: {
        title: `Daily Quest: ${selected.map((t) => t.title).join(" & ")}`,
        description: `Solve today's recommended questions on LeetCode.`,
        type: ChallengeType.DAILY,
        difficulty: targetDifficulty,
        xpReward: targetDifficulty === Difficulty.HARD ? 75 : targetDifficulty === Difficulty.MEDIUM ? 50 : 30,
        problems: {
          create: selected.map((t) => ({
            problemName: t.title,
            problemSlug: t.slug,
            difficulty: t.difficulty,
            topic: t.topic,
          })),
        },
      },
    });

    const userChallenge = await tx.userChallenge.create({
      data: {
        userId,
        challengeId: challenge.id,
        status: ChallengeStatus.ACTIVE,
        progress: 0,
      },
    });

    return { challenge, userChallenge };
  });
}

export async function generateWeeklyChallenge(userId: string) {
  // 1. Fetch user parameters
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { preferences: true, leetcodeProfile: { include: { submissions: true } } },
  });

  if (!user) throw new Error("User not found.");

  const targetDifficulty = user.preferences?.preferredDifficulty || Difficulty.EASY;
  const targetCompany = user.targetCompany;

  // 2. Fetch already solved problem slugs
  const solvedSlugs = new Set<string>();
  if (user.leetcodeProfile) {
    user.leetcodeProfile.submissions.forEach((sub) => {
      solvedSlugs.add(sub.slug);
    });
  }

  // 3. Recommend questions
  const selected = recommendQuestions({
    solvedSlugs,
    targetDifficulty,
    targetCompany,
    count: 5,
  });

  // 4. Create the challenge in database
  return await db.$transaction(async (tx) => {
    // Mark previous weekly challenges as FAILED if they weren't completed
    await tx.userChallenge.updateMany({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        challenge: {
          type: ChallengeType.WEEKLY,
        },
      },
      data: {
        status: ChallengeStatus.FAILED,
      },
    });

    const challenge = await tx.challenge.create({
      data: {
        title: `Weekly Quest: Elite 5 Challenge`,
        description: `Conquer 5 handpicked DSA problems this week for massive rewards.`,
        type: ChallengeType.WEEKLY,
        difficulty: targetDifficulty,
        xpReward: 150, // Massive XP reward
        problems: {
          create: selected.map((t) => ({
            problemName: t.title,
            problemSlug: t.slug,
            difficulty: t.difficulty,
            topic: t.topic,
          })),
        },
      },
    });

    const userChallenge = await tx.userChallenge.create({
      data: {
        userId,
        challengeId: challenge.id,
        status: ChallengeStatus.ACTIVE,
        progress: 0,
      },
    });

    return { challenge, userChallenge };
  });
}

export async function generateRevisionChallenge(userId: string) {
  // 1. Fetch user parameters, including stats to locate weakest topic
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
      stats: true,
      leetcodeProfile: { include: { submissions: true } }
    },
  });

  if (!user) throw new Error("User not found.");

  // Identify weak topic: fall back to "DP" or "Arrays" if none synced yet
  const weakTopic = user.stats?.weakestTopic || "DP";
  const targetCompany = user.targetCompany;

  // 2. Fetch solved slugs
  const solvedSlugs = new Set<string>();
  if (user.leetcodeProfile) {
    user.leetcodeProfile.submissions.forEach((sub) => {
      solvedSlugs.add(sub.slug);
    });
  }

  // 3. Recommend questions
  const selected = recommendQuestions({
    solvedSlugs,
    targetDifficulty: user.preferences?.preferredDifficulty || Difficulty.EASY,
    targetCompany,
    topic: weakTopic,
    count: 2,
    allowAlreadySolved: true, // Allow revising solved questions if needed
  });

  // 4. Create the challenge in database
  return await db.$transaction(async (tx) => {
    // Mark previous revision challenges as FAILED if they weren't completed
    await tx.userChallenge.updateMany({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        challenge: {
          type: ChallengeType.REVISION,
        },
      },
      data: {
        status: ChallengeStatus.FAILED,
      },
    });

    const challenge = await tx.challenge.create({
      data: {
        title: `Revision Shield: ${weakTopic} Focus`,
        description: `Targeting your weakest area: ${weakTopic}. Solve these 2 revision questions to level up your competency score.`,
        type: ChallengeType.REVISION,
        difficulty: selected[0]?.difficulty || Difficulty.EASY,
        xpReward: 80, // Solid XP reward
        problems: {
          create: selected.map((t) => ({
            problemName: t.title,
            problemSlug: t.slug,
            difficulty: t.difficulty,
            topic: t.topic,
          })),
        },
      },
    });

    const userChallenge = await tx.userChallenge.create({
      data: {
        userId,
        challengeId: challenge.id,
        status: ChallengeStatus.ACTIVE,
        progress: 0,
      },
    });

    return { challenge, userChallenge };
  });
}

export async function verifyChallengeCompletion(userId: string) {
  // Fetch active user challenges
  const activeChallenges = await db.userChallenge.findMany({
    where: {
      userId,
      status: ChallengeStatus.ACTIVE,
    },
    include: {
      challenge: {
        include: {
          problems: true,
        },
      },
    },
  });

  if (activeChallenges.length === 0) {
    return { verifiedCount: 0 };
  }

  // Fetch recent user submissions
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
    include: { submissions: true },
  });

  if (!profile) return { verifiedCount: 0 };

  const solvedSlugs = new Set(profile.submissions.map((s) => s.slug));
  let verifiedCount = 0;

  for (const uc of activeChallenges) {
    const problems = uc.challenge.problems;
    // Check if ALL problems in this challenge have been solved
    const allSolved = problems.every((p) => solvedSlugs.has(p.problemSlug));

    if (allSolved) {
      await db.$transaction(async (tx) => {
        // Mark challenge as completed
        await tx.userChallenge.update({
          where: { id: uc.id },
          data: {
            status: ChallengeStatus.COMPLETED,
            completedAt: new Date(),
            progress: 100,
          },
        });

        // Award XP
        await awardXp(userId, uc.challenge.xpReward, `Completed challenge: ${uc.challenge.title}`);

        // Update streak
        if (uc.challenge.type === ChallengeType.DAILY) {
          await incrementStreak(userId);
        }
      });
      verifiedCount++;
    }
  }

  return { verifiedCount };
}
