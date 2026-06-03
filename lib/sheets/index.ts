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

export interface SheetProblemRef {
  sheetSlug: string;
  problemKey: string;
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
