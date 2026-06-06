import { buildUserContext, type UserAIContext } from "@/lib/ai/context";

export interface ProactiveGreeting {
  reply: string;
  suggestions: string[];
}

/**
 * A deterministic, personalized opening message for the mentor chat. No LLM
 * call - instant and free. Picks the single most pressing signal (slipping
 * streak, looming interview, active quest, or a progress recap) so the very
 * first thing the user sees is actionable.
 */
export async function getProactiveGreeting(
  userId: string,
  mentorNameFallback = "Sensei"
): Promise<ProactiveGreeting> {
  let ctx: UserAIContext | null = null;
  try {
    ctx = await buildUserContext(userId);
  } catch {
    /* fall through to generic greeting */
  }

  if (!ctx) {
    return {
      reply: `Hey! I'm ${mentorNameFallback}, your AI coach. Connect your LeetCode and let's get to work.`,
      suggestions: ["Recommend a problem", "How should I prep?"],
    };
  }

  const m = ctx.mentorName;
  const topWeak = ctx.topics.weak[0]?.topic;
  const recent = ctx.leetcode.recentSolved[0]?.title;

  // 1) Looming interview takes top priority.
  if (ctx.daysToInterview != null && ctx.daysToInterview <= 30) {
    const focus = topWeak ? ` Your weakest area right now is **${topWeak}** - let's hammer it.` : "";
    return {
      reply: `${ctx.daysToInterview} days to your interview, ${ctx.name}. Target is ${ctx.dailyTarget} problems/day.${focus}`,
      suggestions: [
        "Build my study plan",
        topWeak ? `Recommend ${topWeak} problems` : "Recommend problems",
        topWeak ? `Quiz me on ${topWeak}` : "Quiz me",
      ],
    };
  }

  // 2) Slipping streak - nudge hard.
  if (ctx.streakStale) {
    return {
      reply:
        ctx.leetcode.total > 0
          ? `${ctx.name}, your streak has gone cold. You're at ${ctx.leetcode.total} solved - don't let momentum die. One problem right now.`
          : `${ctx.name}, time to start. Let's get your first solve on the board today.`,
      suggestions: [
        topWeak ? `Recommend an easy ${topWeak} problem` : "Recommend an easy problem",
        "Build my study plan",
        "Roast my discipline",
      ],
    };
  }

  // 3) Active quest waiting.
  if (ctx.activeQuest) {
    return {
      reply: `Nice ${ctx.currentStreak}-day streak, ${ctx.name}! You've got an active quest lined up: ${ctx.activeQuest}`,
      suggestions: ["Walk me through the first one", topWeak ? `Why am I weak in ${topWeak}?` : "Review my progress"],
    };
  }

  // 4) Default: progress recap.
  const recapBits = [
    `You're Level ${ctx.level} with ${ctx.leetcode.total} solved`,
    ctx.currentStreak > 0 ? `a ${ctx.currentStreak}-day streak` : null,
    recent ? `last solved "${recent}"` : null,
  ].filter(Boolean);

  return {
    reply: `Welcome back, ${ctx.name}! ${recapBits.join(", ")}.${
      topWeak ? ` Biggest gap: **${topWeak}**. Want to close it?` : " What are we working on?"
    } - ${m}`,
    suggestions: [
      topWeak ? `Recommend ${topWeak} problems` : "Recommend a problem",
      "Check my weak topics",
      "Build my study plan",
    ],
  };
}
