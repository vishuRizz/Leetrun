/**
 * DSA sheet catalog + normalizer.
 *
 * The raw sheet JSONs (Striver SDE / A2Z / 79) each use a slightly different
 * shape (`days`, `steps → topics`, `topics`). We normalize them all into a
 * single `NormalizedSheet` structure (sections → problems) so the UI and
 * progress tracking can treat every sheet identically.
 *
 * Sheet content is static reference data - it's bundled at build time and
 * shared by all users. We never store the problems per-user; only the user's
 * completion checkmarks live in the DB (see `SheetProgress`).
 */
import sdeSheet from "@/sheets/striver-SDE-sheet.json";
import a2zSheet from "@/sheets/striver-a2zsheet.json";
import sheet79 from "@/sheets/striver-last-moment-79-sheet.json";
import blind75Sheet from "@/sheets/blind-75-sheet.json";
import neetcode150Sheet from "@/sheets/neetcode-150-sheet.json";
import loveBabbar450Sheet from "@/sheets/love-babbar-450-sheet.json";
import googleTop100Sheet from "@/sheets/Google Top 100.json";
import amazonTop100Sheet from "@/sheets/Amazon Top 100.json";

export type SheetCategory = "curated" | "company";

export type SheetDifficulty = "easy" | "medium" | "hard";

export interface NormalizedProblem {
  /** Stable unique key within the sheet (the raw problem `id`). */
  key: string;
  title: string;
  difficulty: SheetDifficulty;
  leetcodeId: number | null;
  leetcodeSlug: string | null;
  gfgSlug: string | null;
}

export interface NormalizedSection {
  id: string;
  title: string;
  /** Optional higher-level grouping (e.g. A2Z "Step" the topic belongs to). */
  group: string | null;
  problems: NormalizedProblem[];
}

export interface NormalizedSheet {
  slug: string;
  name: string;
  total: number;
  source: string | null;
  description: string | null;
  category: SheetCategory;
  company: string | null;
  sections: NormalizedSection[];
}

interface RawProblem {
  id: number | string;
  title: string;
  difficulty?: string;
  leetcode_id?: number | null;
  leetcode_slug?: string | null;
  gfg_slug?: string | null;
}

function normalizeProblem(p: RawProblem): NormalizedProblem {
  const diff = (p.difficulty || "easy").toLowerCase();
  const difficulty: SheetDifficulty =
    diff === "hard" ? "hard" : diff === "medium" ? "medium" : "easy";
  return {
    key: String(p.id),
    title: p.title,
    difficulty,
    leetcodeId: p.leetcode_id ?? null,
    leetcodeSlug: p.leetcode_slug ?? null,
    gfgSlug: p.gfg_slug ?? null,
  };
}

function normalizeSde(raw: typeof sdeSheet): NormalizedSheet {
  return {
    slug: raw.slug,
    name: raw.sheet,
    total: raw.total,
    source: raw.source ?? null,
    description: null,
    category: "curated",
    company: null,
    sections: raw.days.map((d) => ({
      id: `day-${d.day}`,
      title: `Day ${d.day} · ${d.title}`,
      group: null,
      problems: (d.problems as RawProblem[]).map(normalizeProblem),
    })),
  };
}

function normalizeA2z(raw: typeof a2zSheet): NormalizedSheet {
  const sections: NormalizedSection[] = [];
  for (const step of raw.steps) {
    for (const topic of step.topics) {
      sections.push({
        id: `topic-${topic.id}`,
        title: topic.title,
        group: `Step ${step.id} · ${step.title}`,
        problems: (topic.problems as RawProblem[]).map(normalizeProblem),
      });
    }
  }
  return {
    slug: raw.slug,
    name: raw.sheet,
    total: raw.total,
    source: raw.source ?? null,
    description: null,
    category: "curated",
    company: null,
    sections,
  };
}

interface RawTopicSheet {
  sheet: string;
  slug: string;
  total: number;
  source?: string | null;
  description?: string;
  company?: string;
  topics: { id: number | string; title: string; problems: RawProblem[] }[];
}

function normalizeTopicSheet(
  raw: RawTopicSheet,
  category: SheetCategory = "curated"
): NormalizedSheet {
  return {
    slug: raw.slug,
    name: raw.sheet,
    total: raw.total,
    source: raw.source ?? null,
    description: raw.description ?? null,
    category,
    company: raw.company ?? null,
    sections: raw.topics.map((t) => ({
      id: `topic-${t.id}`,
      title: t.title,
      group: null,
      problems: (t.problems as RawProblem[]).map(normalizeProblem),
    })),
  };
}

// Build once at module load - these are pure transforms over static JSON.
const SHEETS: NormalizedSheet[] = [
  normalizeTopicSheet(blind75Sheet),
  normalizeTopicSheet(neetcode150Sheet),
  normalizeSde(sdeSheet),
  normalizeA2z(a2zSheet),
  normalizeTopicSheet(sheet79),
  normalizeTopicSheet(loveBabbar450Sheet),
  normalizeTopicSheet(googleTop100Sheet, "company"),
  normalizeTopicSheet(amazonTop100Sheet, "company"),
];

const SHEET_BY_SLUG = new Map(SHEETS.map((s) => [s.slug, s]));

export interface SheetSummary {
  slug: string;
  name: string;
  total: number;
  description: string | null;
  source: string | null;
  category: SheetCategory;
  company: string | null;
  sectionCount: number;
  difficultyCounts: { easy: number; medium: number; hard: number };
}

function difficultyCounts(sheet: NormalizedSheet) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const section of sheet.sections) {
    for (const p of section.problems) counts[p.difficulty]++;
  }
  return counts;
}

export function getSheetSummaries(): SheetSummary[] {
  return SHEETS.map((s) => ({
    slug: s.slug,
    name: s.name,
    total: s.total,
    description: s.description,
    source: s.source,
    category: s.category,
    company: s.company,
    sectionCount: s.sections.length,
    difficultyCounts: difficultyCounts(s),
  }));
}

export function getSheet(slug: string): NormalizedSheet | null {
  return SHEET_BY_SLUG.get(slug) ?? null;
}

export interface FlatProblem {
  title: string;
  difficulty: SheetDifficulty;
  leetcodeSlug: string | null;
  /** Names of the sheets this problem appears in. */
  sheets: string[];
}

let cachedFlatProblems: FlatProblem[] | null = null;

/**
 * Flat, deduped list of every problem across all sheets (keyed by LeetCode slug
 * when available, else title). Used by the AI retrieval layer to ground problem
 * recommendations in real, curated questions.
 */
export function getAllProblems(): FlatProblem[] {
  if (cachedFlatProblems) return cachedFlatProblems;

  const byKey = new Map<string, FlatProblem>();
  for (const sheet of SHEETS) {
    for (const section of sheet.sections) {
      for (const p of section.problems) {
        const key = (p.leetcodeSlug || p.title).toLowerCase();
        const existing = byKey.get(key);
        if (existing) {
          if (!existing.sheets.includes(sheet.name)) existing.sheets.push(sheet.name);
        } else {
          byKey.set(key, {
            title: p.title,
            difficulty: p.difficulty,
            leetcodeSlug: p.leetcodeSlug,
            sheets: [sheet.name],
          });
        }
      }
    }
  }

  cachedFlatProblems = Array.from(byKey.values());
  return cachedFlatProblems;
}

export function getSheetSlugs(): string[] {
  return SHEETS.map((s) => s.slug);
}

/** Total problem count for a sheet (from normalized sections, not the JSON `total`). */
export function countProblems(sheet: NormalizedSheet): number {
  return sheet.sections.reduce((sum, s) => sum + s.problems.length, 0);
}

/** Set of all valid problem keys in a sheet - used to validate progress writes. */
export function validProblemKeys(sheet: NormalizedSheet): Set<string> {
  const keys = new Set<string>();
  for (const section of sheet.sections) {
    for (const p of section.problems) keys.add(p.key);
  }
  return keys;
}

/**
 * Canonical, stable reference for a problem used to key per-user notes. We
 * prefer the LeetCode slug so a note follows the same problem across every
 * sheet (and other surfaces). Falls back to GFG slug, then a sheet-scoped key
 * for problems with no external slug.
 */
export function problemRef(
  p: { leetcodeSlug: string | null; gfgSlug: string | null; key: string },
  sheetSlug: string
): string {
  if (p.leetcodeSlug) return p.leetcodeSlug.toLowerCase();
  if (p.gfgSlug) return `gfg:${p.gfgSlug.toLowerCase()}`;
  return `sheet:${sheetSlug}:${p.key}`;
}

export interface SheetProblemRef {
  sheetSlug: string;
  problemKey: string;
}

/**
 * Maps a coarse topic label (as produced by the analytics topic classifier:
 * Arrays, Strings, Graph, DP, ...) to keywords we look for in sheet *section*
 * titles. This lets us pull real, curated problems for a weak topic straight
 * from the sheets the user already browses.
 */
const TOPIC_SECTION_KEYWORDS: Record<string, string[]> = {
  arrays: ["array", "hashing", "prefix"],
  array: ["array", "hashing", "prefix"],
  strings: ["string"],
  string: ["string"],
  "binary search": ["binary search"],
  trees: ["tree", "trie", "bst"],
  tree: ["tree", "trie", "bst"],
  "tree dp": ["tree", "dynamic programming"],
  graph: ["graph"],
  graphs: ["graph"],
  dp: ["dynamic programming", "dp"],
  "dynamic programming": ["dynamic programming", "dp"],
  "linked list": ["linked list"],
  sorting: ["sort"],
  hashmap: ["hashing", "hash"],
  hashing: ["hashing", "hash"],
  heap: ["heap", "priority"],
  greedy: ["greedy"],
  backtracking: ["backtrack"],
  "sliding window": ["sliding window"],
  "two pointers": ["two pointer"],
  stack: ["stack"],
  intervals: ["interval"],
  "bit manipulation": ["bit"],
  math: ["math", "geometry"],
  design: ["design"],
};

export interface RecommendedProblem {
  title: string;
  /** LeetCode title slug (for the Solve link). */
  slug: string;
  difficulty: SheetDifficulty;
  sheetSlug: string;
  sheetName: string;
}

/**
 * Recommend up to `limit` curated problems for a weak topic, drawn from the
 * bundled sheets. Already-solved problems (by LeetCode slug) are pushed to the
 * back so the user gets fresh practice first, but we still fall back to solved
 * ones (as revision) if there aren't enough unsolved matches. Easier problems
 * come first to rebuild confidence in a weak area.
 */
const DIFF_RANK: Record<SheetDifficulty, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

/**
 * All curated problems for a topic, split into unsolved (easy→hard) then
 * already-solved (easy→hard). Deduped by LeetCode slug across sheets.
 */
export function problemsForTopic(
  topicLabel: string,
  solvedSlugs: Set<string>
): { unsolved: RecommendedProblem[]; solved: RecommendedProblem[] } {
  const key = (topicLabel || "").trim().toLowerCase();
  let keywords = TOPIC_SECTION_KEYWORDS[key];
  if (!keywords || keywords.length === 0) {
    keywords = key.split(/[^a-z]+/).filter((w) => w.length > 2);
  }
  if (keywords.length === 0) keywords = [key];

  const seen = new Set<string>();
  const unsolved: RecommendedProblem[] = [];
  const solved: RecommendedProblem[] = [];

  for (const sheet of SHEETS) {
    for (const section of sheet.sections) {
      const title = section.title.toLowerCase();
      if (!keywords.some((k) => k && title.includes(k))) continue;
      for (const p of section.problems) {
        if (!p.leetcodeSlug) continue;
        const slug = p.leetcodeSlug.toLowerCase();
        if (seen.has(slug)) continue;
        seen.add(slug);
        const rec: RecommendedProblem = {
          title: p.title,
          slug: p.leetcodeSlug,
          difficulty: p.difficulty,
          sheetSlug: sheet.slug,
          sheetName: sheet.name,
        };
        (solvedSlugs.has(slug) ? solved : unsolved).push(rec);
      }
    }
  }

  const byDiff = (a: RecommendedProblem, b: RecommendedProblem) =>
    DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty];
  unsolved.sort(byDiff);
  solved.sort(byDiff);
  return { unsolved, solved };
}

export function recommendProblemsForTopic(
  topicLabel: string,
  solvedSlugs: Set<string>,
  limit = 5
): RecommendedProblem[] {
  const { unsolved, solved } = problemsForTopic(topicLabel, solvedSlugs);
  const out = unsolved.slice(0, limit);
  if (out.length < limit) {
    out.push(...solved.slice(0, limit - out.length));
  }
  return out;
}

/** Map LeetCode titleSlug → sheet problem refs across all sheets. */
export function buildLeetcodeSlugIndex(): Map<string, SheetProblemRef[]> {
  const map = new Map<string, SheetProblemRef[]>();
  for (const sheet of SHEETS) {
    for (const section of sheet.sections) {
      for (const p of section.problems) {
        if (!p.leetcodeSlug) continue;
        const slug = p.leetcodeSlug.toLowerCase();
        const refs = map.get(slug) || [];
        refs.push({ sheetSlug: sheet.slug, problemKey: p.key });
        map.set(slug, refs);
      }
    }
  }
  return map;
}
