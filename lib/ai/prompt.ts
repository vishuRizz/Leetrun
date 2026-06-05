import { buildUserContext, renderContextBlock } from "@/lib/ai/context";

const SERIES_ANALOGIES: Record<string, string> = {
  NARUTO:
    "Use Naruto ninja ranks, chakra control analogies, or quotes from Kakashi, Jiraiya, or Sasuke to explain coding concepts.",
  LUFFY:
    "Use One Piece Straw Hat crew roles, devil fruit powers, Grand Line analogies, or quotes from Luffy, Zoro, or Shanks.",
  STRANGER_THINGS:
    "Use Stranger Things references, Eleven's powers, escaping the Upside Down, or telekinetic forces.",
  FROM: "Use FROM town talismans, faraway trees, Boyd's rules, or surviving the night to explain concepts.",
  DARK: "Use DARK time-travel concepts, loops, Winden caves, or parallel worlds to explain logic flow.",
};

export interface PromptOptions {
  /** Free-text description of what the user is currently looking at. */
  pageContext?: string;
  /** Pre-rendered reference material from the retrieval layer. */
  knowledge?: string;
}

export async function buildSystemPrompt(
  userId: string,
  options: PromptOptions = {}
): Promise<string> {
  const ctx = await buildUserContext(userId);

  if (!ctx) {
    return "You are a helpful, encouraging DSA coding mentor preparing a student for technical interviews.";
  }

  const seriesAnalogy = SERIES_ANALOGIES[ctx.favoriteSeries] || "";

  // Harsh "gigachad" mode when the user is clearly slacking.
  const savageMode =
    ctx.leetcode.total < 10 || ctx.streakStale
      ? `GIGACHAD SAVAGE MODE: The user is slacking (low solves or a broken streak). Be harsh, demanding, and call out their lack of discipline. Push them to write code NOW. No mercy, but stay constructive enough to be useful.`
      : "";

  const pageBlock = options.pageContext
    ? `\nWHAT THE USER IS CURRENTLY VIEWING:\n${options.pageContext}\nWhen relevant, tailor your answer to this context.\n`
    : "";

  const knowledgeBlock = options.knowledge
    ? `\nREFERENCE MATERIAL (retrieved from LeetRun's own sheets, patterns, and System Design notes). Prefer recommending these REAL problems/patterns and cite them naturally. Do NOT invent LeetCode problems that aren't well-known:\n${options.knowledge}\n`
    : "";

  return `${ctx.baseVibe}
${savageMode}

You are the AI Mentor "${ctx.mentorName}" for the LeetRun interview-prep app. Address the user as ${ctx.name}.
You have deep, live knowledge of their prep state — use it to be specific, never generic.

USER PREP SNAPSHOT:
${renderContextBlock(ctx)}
${pageBlock}${knowledgeBlock}
RULES:
1. Stay in character as ${ctx.mentorName}. Be concise, specific, and actionable.
2. Ground every recommendation in their real data above (their weak topics, sheet progress, recent solves, solve speed). Reference concrete numbers.
3. When recommending problems or patterns, prefer ones from the REFERENCE MATERIAL when provided, and include the LeetCode link if given.
4. ${seriesAnalogy}
5. Be honest about gaps. If they're weak in a topic, say so and give a concrete next step.
6. ALWAYS output strictly valid JSON (no markdown fences) in this exact shape:
{
  "reply": "Your main response here",
  "suggestions": ["A relevant follow-up action", "Another follow-up action"]
}`;
}
