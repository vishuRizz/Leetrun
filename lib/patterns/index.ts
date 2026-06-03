import bank from "@/DSA Question Bank.json";

export type PatternDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface PatternQuestion {
  id: number;
  lcNumber: number | null;
  title: string;
  slug: string;
  difficulty: PatternDifficulty;
  topic: string;
  pattern: string;
  companies: string[];
  level: number;
}

export interface PatternGroup {
  pattern: string;
  count: number;
  questions: PatternQuestion[];
}

export interface PatternFamily {
  name: string;
  count: number;
  weightage: number;
  easy: number;
  medium: number;
  hard: number;
  patterns: PatternGroup[];
}

interface RawQuestion {
  id: number;
  lcNumber?: number | null;
  title: string;
  slug: string;
  difficulty: string;
  topic: string;
  tags?: string[];
  companies?: string[];
  pattern?: string;
  level?: number;
}

function normalizeDifficulty(d: string): PatternDifficulty {
  const v = (d || "").toUpperCase();
  return v === "HARD" ? "HARD" : v === "MEDIUM" ? "MEDIUM" : "EASY";
}

/**
 * Collapse the very granular `pattern` strings (~170 of them) into a handful of
 * interview-relevant pattern families. When a pattern doesn't match any family
 * keyword we fall back to the question's broad topic so nothing lands in a giant
 * "Other" bucket.
 */
function classifyFamily(pattern: string, topic: string): string {
  const p = pattern.toLowerCase();
  const t = topic.toLowerCase();

  if (/trie/.test(p)) return "Trie";
  if (/backtrack/.test(p)) return "Backtracking";
  if (/knapsack|\bdp\b|dynamic|kadane|patience|state machine/.test(p))
    return "Dynamic Programming";
  if (/window/.test(p)) return "Sliding Window";
  if (/binary search|modified binary|staircase search/.test(p))
    return "Binary Search";
  if (/two pointer|fast\s*\/\s*slow|dutch national|sentinel/.test(p))
    return "Two Pointers";
  if (/heap|priority/.test(p)) return "Heap / Priority Queue";
  if (/stack|monotonic/.test(p)) return "Stack & Monotonic Stack";
  if (
    /bfs|dfs|topological|union find|dijkstra|bellman|floyd-warshall|prim|kruskal|kahn|hierholzer|coloring|\bmst\b|multi-source|graph|cycle detection/.test(
      p
    )
  ) {
    return /tree|bst/.test(t) ? "Trees & BST" : "Graphs";
  }
  if (/\bbst\b|inorder|tree|\blca\b|serializ|height check/.test(p))
    return "Trees & BST";
  if (/interval/.test(p)) return "Intervals";
  if (/greedy|voting|boyer-moore/.test(p)) return "Greedy";
  if (/xor|\bbit\b|bit reversal|bit counting/.test(p)) return "Bit Manipulation";
  if (
    /hashmap|hashset|hash|frequency|prefix sum|index as hash|index marking|in-place marking/.test(
      p
    )
  )
    return "Hashing";
  if (/divide & conquer|divide and conquer/.test(p)) return "Divide & Conquer";
  if (/merge sort|quick sort|\bsort/.test(p)) return "Sorting";
  if (
    /reversal|carry simulation|group reversal|merge on list|cycle/.test(p) &&
    /linked/.test(t)
  )
    return "Linked List";
  if (/math|sieve|exponent|multiplication|gauss/.test(p)) return "Math";

  // Fall back to the curated broad topic, merging a couple of names that would
  // otherwise create near-duplicate families.
  const fallback = topic || "Other";
  if (/^(trees?|bst)$/i.test(fallback)) return "Trees & BST";
  if (/^stack$/i.test(fallback)) return "Stack & Monotonic Stack";
  return fallback;
}

let cachedFamilies: PatternFamily[] | null = null;

export function getPatternFamilies(): PatternFamily[] {
  if (cachedFamilies) return cachedFamilies;

  const questions = (bank.questions as RawQuestion[]) || [];
  const total = questions.length;

  const familyMap = new Map<
    string,
    { questions: PatternQuestion[]; patternMap: Map<string, PatternQuestion[]> }
  >();

  for (const raw of questions) {
    const pattern = raw.pattern?.trim() || "General";
    const family = classifyFamily(pattern, raw.topic || "");
    const q: PatternQuestion = {
      id: raw.id,
      lcNumber: raw.lcNumber ?? null,
      title: raw.title,
      slug: raw.slug,
      difficulty: normalizeDifficulty(raw.difficulty),
      topic: raw.topic || "General",
      pattern,
      companies: raw.companies ?? [],
      level: raw.level ?? 1,
    };

    let entry = familyMap.get(family);
    if (!entry) {
      entry = { questions: [], patternMap: new Map() };
      familyMap.set(family, entry);
    }
    entry.questions.push(q);
    const bucket = entry.patternMap.get(pattern) ?? [];
    bucket.push(q);
    entry.patternMap.set(pattern, bucket);
  }

  const families: PatternFamily[] = Array.from(familyMap.entries()).map(
    ([name, entry]) => {
      const patterns: PatternGroup[] = Array.from(entry.patternMap.entries())
        .map(([pattern, qs]) => ({
          pattern,
          count: qs.length,
          questions: qs.sort((a, b) => a.title.localeCompare(b.title)),
        }))
        .sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));

      const easy = entry.questions.filter((q) => q.difficulty === "EASY").length;
      const medium = entry.questions.filter(
        (q) => q.difficulty === "MEDIUM"
      ).length;
      const hard = entry.questions.filter((q) => q.difficulty === "HARD").length;

      return {
        name,
        count: entry.questions.length,
        weightage: total > 0 ? Math.round((entry.questions.length / total) * 100) : 0,
        easy,
        medium,
        hard,
        patterns,
      };
    }
  );

  families.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  cachedFamilies = families;
  return families;
}

export function getPatternsTotalQuestions(): number {
  return ((bank.questions as RawQuestion[]) || []).length;
}
