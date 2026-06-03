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

/** Topics available for the configurable revision builder. */
export function getRevisionTopics(): string[] {
  const meta = (questionBankData as any).meta;
  if (Array.isArray(meta?.topics) && meta.topics.length > 0) {
    return [...meta.topics].sort((a: string, b: string) => a.localeCompare(b));
  }
  // Derive from the bank as a fallback.
  return Array.from(new Set(QUESTIONS.map((q) => q.topic))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function revisionXpFor(difficulty: "EASY" | "MEDIUM" | "HARD"): number {
  return difficulty === "HARD" ? 40 : difficulty === "MEDIUM" ? 25 : 15;
}

export type RevisionSolvedFilter = "any" | "solved" | "unsolved";

export interface RevisionConfig {
  topics: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD" | "ANY";
  solvedFilter: RevisionSolvedFilter;
  count?: number;
}

/**
 * Build a random revision quest from the question bank that matches a
 * user-supplied configuration (topics, difficulty, solved/unsolved). Returns
 * the created userChallenge plus how many candidates matched the filters.
 */
export async function generateConfigurableRevision(
  userId: string,
  config: RevisionConfig
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const solved = await getSolvedSlugSet(userId);
  const wantTopics = (config.topics || [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const matches = QUESTIONS.filter((q) => {
    if (wantTopics.length > 0 && !wantTopics.includes(q.topic.toLowerCase())) {
      return false;
    }
    if (config.difficulty !== "ANY" && q.difficulty !== config.difficulty) {
      return false;
    }
    if (config.solvedFilter === "solved" && !solved.has(q.slug)) return false;
    if (config.solvedFilter === "unsolved" && solved.has(q.slug)) return false;
    return true;
  });

  if (matches.length === 0) {
    throw new Error(
      "No questions match these filters. Try widening your selection."
    );
  }

  // Fisher–Yates shuffle, then take the requested count.
  const pool = [...matches];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const count = Math.min(Math.max(config.count ?? 1, 1), 5);
  const selected = pool.slice(0, count);

  const xpReward = selected.reduce(
    (sum, q) => sum + revisionXpFor(q.difficulty),
    0
  );

  const topicLabel =
    wantTopics.length === 0
      ? "Mixed topics"
      : config.topics.length === 1
      ? config.topics[0]
      : `${config.topics.length} topics`;

  const userChallenge = await db.$transaction(async (tx) => {
    await tx.userChallenge.updateMany({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        challenge: { type: ChallengeType.REVISION },
      },
      data: { status: ChallengeStatus.FAILED },
    });

    const challenge = await tx.challenge.create({
      data: {
        title:
          selected.length === 1
            ? `Revision: ${selected[0].title}`
            : `Revision: ${topicLabel}`,
        description: `Custom revision set · ${topicLabel}. Solve ${
          selected.length === 1 ? "this problem" : "these problems"
        } and mark them done to claim your XP.`,
        type: ChallengeType.REVISION,
        difficulty: (selected[0]?.difficulty as Difficulty) || Difficulty.EASY,
        xpReward,
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

    return tx.userChallenge.create({
      data: {
        userId,
        challengeId: challenge.id,
        status: ChallengeStatus.ACTIVE,
        progress: 0,
      },
    });
  });

  return { userChallenge, matchCount: matches.length, xpReward };
}

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

/**
 * Build the set of every problem slug the user has solved on LeetCode.
 * Combines recent submissions (lightweight sync) with the full deep-synced
 * solve history so quest verification is accurate.
 */
export async function getSolvedSlugSet(userId: string): Promise<Set<string>> {
  const profile = await db.leetcodeProfile.findUnique({
    where: { userId },
    select: {
      submissions: { select: { slug: true } },
      solvedProblems: { select: { titleSlug: true } },
    },
  });

  const set = new Set<string>();
  if (profile) {
    profile.submissions.forEach((s) => set.add(s.slug));
    profile.solvedProblems.forEach((s) => set.add(s.titleSlug));
  }
  return set;
}

/**
 * Expire stale ACTIVE quests so fresh ones are generated:
 * - DAILY / REVISION: expire if assigned before the start of today.
 * - WEEKLY: expire if assigned more than 7 days ago.
 * Expired-but-unfinished quests are marked FAILED.
 */
export async function expireStaleActiveChallenges(userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  await Promise.all([
    db.userChallenge.updateMany({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        assignedAt: { lt: startOfToday },
        challenge: {
          type: { in: [ChallengeType.DAILY, ChallengeType.REVISION] },
        },
      },
      data: { status: ChallengeStatus.FAILED },
    }),
    db.userChallenge.updateMany({
      where: {
        userId,
        status: ChallengeStatus.ACTIVE,
        assignedAt: { lt: weekAgo },
        challenge: { type: ChallengeType.WEEKLY },
      },
      data: { status: ChallengeStatus.FAILED },
    }),
  ]);
}

/**
 * If every problem in a quest is completed, mark it COMPLETED and award XP
 * exactly once. Always keeps the `progress` percentage in sync.
 */
async function finalizeQuestProgress(
  userId: string,
  userChallengeId: string
): Promise<{ status: ChallengeStatus; progress: number; xpAwarded: number }> {
  const uc = await db.userChallenge.findUnique({
    where: { id: userChallengeId },
    include: {
      challenge: { include: { problems: true } },
      problemProgress: true,
    },
  });

  if (!uc || uc.userId !== userId) {
    throw new Error("Quest not found.");
  }

  const total = uc.challenge.problems.length;
  const doneIds = new Set(
    uc.problemProgress.filter((p) => p.completed).map((p) => p.problemId)
  );
  const doneCount = uc.challenge.problems.filter((p) =>
    doneIds.has(p.id)
  ).length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  // Already completed - just report current state.
  if (uc.status === ChallengeStatus.COMPLETED) {
    return { status: ChallengeStatus.COMPLETED, progress: 100, xpAwarded: 0 };
  }

  if (!allDone) {
    if (uc.progress !== progress) {
      await db.userChallenge.update({
        where: { id: uc.id },
        data: { progress },
      });
    }
    return { status: uc.status, progress, xpAwarded: 0 };
  }

  await db.userChallenge.update({
    where: { id: uc.id },
    data: {
      status: ChallengeStatus.COMPLETED,
      completedAt: new Date(),
      progress: 100,
    },
  });

  await awardXp(
    userId,
    uc.challenge.xpReward,
    `Completed quest: ${uc.challenge.title}`
  );

  if (uc.challenge.type === ChallengeType.DAILY) {
    await incrementStreak(userId).catch(() => {});
  }

  return {
    status: ChallengeStatus.COMPLETED,
    progress: 100,
    xpAwarded: uc.challenge.xpReward,
  };
}

/** Manually toggle a single problem's completion (self-report). */
export async function setQuestProblemCompletion(
  userId: string,
  userChallengeId: string,
  problemId: string,
  completed: boolean
) {
  const uc = await db.userChallenge.findUnique({
    where: { id: userChallengeId },
    include: { challenge: { include: { problems: true } } },
  });

  if (!uc || uc.userId !== userId) {
    throw new Error("Quest not found.");
  }
  if (!uc.challenge.problems.some((p) => p.id === problemId)) {
    throw new Error("Problem does not belong to this quest.");
  }
  if (uc.status === ChallengeStatus.COMPLETED) {
    return finalizeQuestProgress(userId, userChallengeId);
  }

  await db.userChallengeProblem.upsert({
    where: { userChallengeId_problemId: { userChallengeId, problemId } },
    update: {
      completed,
      completedAt: completed ? new Date() : null,
    },
    create: {
      userChallengeId,
      problemId,
      completed,
      verified: false,
      completedAt: completed ? new Date() : null,
    },
  });

  return finalizeQuestProgress(userId, userChallengeId);
}

/**
 * Verify a quest against the user's actual LeetCode solves. Auto-marks every
 * problem found in their solve history, then completes + awards XP if done.
 */
export async function verifyQuest(userId: string, userChallengeId: string) {
  const uc = await db.userChallenge.findUnique({
    where: { id: userChallengeId },
    include: {
      challenge: { include: { problems: true } },
      problemProgress: true,
    },
  });

  if (!uc || uc.userId !== userId) {
    throw new Error("Quest not found.");
  }

  const solved = await getSolvedSlugSet(userId);
  const alreadyDone = new Set(
    uc.problemProgress.filter((p) => p.completed).map((p) => p.problemId)
  );

  let newlyVerified = 0;
  for (const p of uc.challenge.problems) {
    if (solved.has(p.problemSlug) && !alreadyDone.has(p.id)) {
      await db.userChallengeProblem.upsert({
        where: {
          userChallengeId_problemId: { userChallengeId, problemId: p.id },
        },
        update: { completed: true, verified: true, completedAt: new Date() },
        create: {
          userChallengeId,
          problemId: p.id,
          completed: true,
          verified: true,
          completedAt: new Date(),
        },
      });
      newlyVerified++;
    }
  }

  const result = await finalizeQuestProgress(userId, userChallengeId);

  const pendingSlugs = uc.challenge.problems
    .filter((p) => !solved.has(p.problemSlug) && !alreadyDone.has(p.id))
    .map((p) => p.problemSlug);

  return { ...result, newlyVerified, pendingSlugs };
}

/**
 * Auto-verify all ACTIVE quests against the user's LeetCode solve history.
 * Reuses verifyQuest so per-problem progress rows stay consistent with the UI.
 */
export async function verifyChallengeCompletion(userId: string) {
  const activeChallenges = await db.userChallenge.findMany({
    where: {
      userId,
      status: ChallengeStatus.ACTIVE,
      // Revision quests are configured + self-claimed by the user, so we don't
      // auto-complete them here (otherwise "already solved" picks would instantly
      // claim XP, defeating the purpose of revising).
      challenge: { type: { in: [ChallengeType.DAILY, ChallengeType.WEEKLY] } },
    },
    select: { id: true },
  });

  if (activeChallenges.length === 0) {
    return { verifiedCount: 0 };
  }

  let verifiedCount = 0;
  for (const uc of activeChallenges) {
    try {
      const result = await verifyQuest(userId, uc.id);
      if (result.status === ChallengeStatus.COMPLETED && result.xpAwarded > 0) {
        verifiedCount++;
      }
    } catch {
      // Skip individual quest failures; keep verifying the rest.
    }
  }

  return { verifiedCount };
}
