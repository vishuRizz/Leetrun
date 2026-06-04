import templatesData from "@/templates/LeetCode Templates.json";
import bank from "@/DSA Question Bank.json";

export interface TemplateProblem {
  title: string;
  leetcodeId: number;
  url: string;
}

export interface PatternTemplate {
  id: number;
  pattern: string;
  frequency: string;
  difficulty: string;
  tags: string[];
  useCases: string[];
  problems: TemplateProblem[];
  template: string;
}

interface RawTemplateProblem {
  title: string;
  leetcode_id: number;
}

interface RawTemplate {
  id: number;
  pattern: string;
  frequency?: string;
  difficulty?: string;
  tags?: string[];
  use_cases?: string[];
  problems?: RawTemplateProblem[];
  template: string;
}

// Map LeetCode problem number -> slug using our question bank so problem links
// resolve correctly. Fall back to slugifying the title for anything missing.
const slugByNumber = new Map<number, string>();
for (const q of (bank as any).questions || []) {
  if (typeof q.lcNumber === "number" && q.slug) {
    slugByNumber.set(q.lcNumber, q.slug);
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function problemUrl(p: RawTemplateProblem): string {
  const slug = slugByNumber.get(p.leetcode_id) || slugify(p.title);
  return `https://leetcode.com/problems/${slug}/`;
}

let cached: PatternTemplate[] | null = null;

export function getPatternTemplates(): PatternTemplate[] {
  if (cached) return cached;
  const raw = (templatesData as { patterns: RawTemplate[] }).patterns || [];
  cached = raw.map((t) => ({
    id: t.id,
    pattern: t.pattern,
    frequency: t.frequency || "medium",
    difficulty: t.difficulty || "medium",
    tags: t.tags || [],
    useCases: t.use_cases || [],
    problems: (t.problems || []).map((p) => ({
      title: p.title,
      leetcodeId: p.leetcode_id,
      url: problemUrl(p),
    })),
    template: t.template,
  }));
  return cached;
}

export function getTemplatesMeta(): { title: string; description: string } {
  const d = templatesData as { title?: string; description?: string };
  return {
    title: d.title || "DSA Templates",
    description: d.description || "",
  };
}
