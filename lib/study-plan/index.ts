import { problemsForTopic, type RecommendedProblem } from "@/lib/sheets";

export interface PlanProblem extends RecommendedProblem {
  topic: string;
  solved: boolean;
}

export interface PlanDay {
  /** YYYY-MM-DD */
  date: string;
  focusTopics: string[];
  problems: PlanProblem[];
}

export interface StudyPlan {
  days: PlanDay[];
  totalProblems: number;
  solvedProblems: number;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build a date-bound study plan from now until the interview date.
 *
 * Strategy: weak topics get the most attention. We build an unsolved-problem
 * pool per topic (weakest first), then round-robin across topics to fill each
 * day with `perDay` problems, so the plan front-loads weak areas while staying
 * varied. Already-solved problems are appended as light revision only if the
 * unsolved pool runs dry. Difficulty ramps easy→hard within each topic.
 */
export function buildStudyPlan(opts: {
  weakTopics: string[];
  allTopics: string[];
  solvedSlugs: Set<string>;
  perDay: number;
  daysUntil: number;
}): StudyPlan {
  const { weakTopics, allTopics, solvedSlugs } = opts;
  const perDay = Math.max(1, Math.min(10, opts.perDay || 3));
  const days = Math.max(1, Math.min(120, opts.daysUntil || 14));

  // Topic priority: weak topics first, then the rest, deduped. Fall back to a
  // sensible default set if we have no signal at all.
  const seenT = new Set<string>();
  const ordered: string[] = [];
  for (const t of [...weakTopics, ...allTopics]) {
    const k = t.trim();
    if (!k || seenT.has(k.toLowerCase())) continue;
    seenT.add(k.toLowerCase());
    ordered.push(k);
  }
  if (ordered.length === 0) {
    ordered.push("Arrays", "Strings", "Trees", "Graph", "Dynamic Programming");
  }

  // Per-topic queues of unsolved problems (then solved as fallback).
  const queues = new Map<string, RecommendedProblem[]>();
  const usedSlugs = new Set<string>();
  for (const topic of ordered) {
    const { unsolved, solved } = problemsForTopic(topic, solvedSlugs);
    queues.set(topic, [...unsolved, ...solved]);
  }

  const totalNeeded = perDay * days;
  const planDays: PlanDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let placed = 0;
  // Round-robin index into the ordered topics, advancing each day so the focus
  // rotates while still weighting weak topics (they appear earliest/most).
  let topicCursor = 0;

  for (let d = 0; d < days && placed < totalNeeded; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dayProblems: PlanProblem[] = [];
    const focus = new Set<string>();

    let attempts = 0;
    while (dayProblems.length < perDay && attempts < ordered.length * 2) {
      const topic = ordered[topicCursor % ordered.length];
      topicCursor++;
      attempts++;
      const q = queues.get(topic);
      if (!q || q.length === 0) continue;
      // Pull the next not-yet-used problem from this topic's queue.
      let next: RecommendedProblem | undefined;
      while (q.length > 0) {
        const cand = q.shift()!;
        if (usedSlugs.has(cand.slug.toLowerCase())) continue;
        next = cand;
        break;
      }
      if (!next) continue;
      usedSlugs.add(next.slug.toLowerCase());
      focus.add(topic);
      dayProblems.push({
        ...next,
        topic,
        solved: solvedSlugs.has(next.slug.toLowerCase()),
      });
      placed++;
    }

    if (dayProblems.length === 0) break; // pool exhausted
    planDays.push({
      date: dayKey(date),
      focusTopics: Array.from(focus),
      problems: dayProblems,
    });
  }

  const totalProblems = planDays.reduce((n, d) => n + d.problems.length, 0);
  const solvedProblems = planDays.reduce(
    (n, d) => n + d.problems.filter((p) => p.solved).length,
    0
  );

  return { days: planDays, totalProblems, solvedProblems };
}
