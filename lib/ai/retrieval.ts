import { getAllProblems } from "@/lib/sheets";
import { getPatternFamilies } from "@/lib/patterns";
import { getSystemDesignNotes, NOTES_REPO_URL } from "@/lib/notes/system-design";

/**
 * Lightweight retrieval ("RAG") grounding for the AI mentor.
 *
 * We index three knowledge sources the app already owns - curated sheet
 * problems, interview pattern families, and the System Design notes - into a
 * flat set of chunks, then do fast lexical scoring against the user's query.
 * This grounds answers in real, citable material instead of hallucinations,
 * with zero extra infrastructure. The chunk shape is intentionally
 * embedding-ready so this can be upgraded to a pgvector index later without
 * touching call sites.
 */

export type KnowledgeKind = "problem" | "pattern" | "notes";

export interface KnowledgeChunk {
  kind: KnowledgeKind;
  title: string;
  text: string;
  url?: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
  "are", "how", "do", "i", "my", "me", "what", "which", "this", "that", "it",
  "can", "should", "about", "give", "help", "need", "want", "some", "any",
  "problem", "problems", "question", "questions", "leetcode", "solve",
]);

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// ---- Corpus (built once, notes cached with a TTL) ----
let staticChunks: KnowledgeChunk[] | null = null;
let notesChunks: KnowledgeChunk[] = [];
let notesFetchedAt = 0;
const NOTES_TTL_MS = 60 * 60 * 1000; // 1h

function buildStaticChunks(): KnowledgeChunk[] {
  if (staticChunks) return staticChunks;
  const chunks: KnowledgeChunk[] = [];

  // Problems
  for (const p of getAllProblems()) {
    chunks.push({
      kind: "problem",
      title: p.title,
      text: `${p.title} - ${p.difficulty} - in sheets: ${p.sheets.join(", ")}`,
      url: p.leetcodeSlug ? `https://leetcode.com/problems/${p.leetcodeSlug}/` : undefined,
    });
  }

  // Pattern families + their granular patterns + a few example problems
  for (const fam of getPatternFamilies()) {
    const patternNames = fam.patterns.map((pt) => pt.pattern).slice(0, 12).join(", ");
    const examples = fam.patterns
      .flatMap((pt) => pt.questions)
      .slice(0, 6)
      .map((q) => q.title)
      .join(", ");
    chunks.push({
      kind: "pattern",
      title: fam.name,
      text: `Pattern family "${fam.name}" (${fam.count} problems, ~${fam.weightage}% of interviews). Techniques: ${patternNames}. Example problems: ${examples}.`,
      url: "/patterns",
    });
  }

  staticChunks = chunks;
  return chunks;
}

function chunkNotes(markdown: string): KnowledgeChunk[] {
  const lines = markdown.split("\n");
  const out: KnowledgeChunk[] = [];
  let title = "";
  let buf: string[] = [];
  let inFence = false;

  const flush = () => {
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (title && text.length > 40) {
      out.push({
        kind: "notes",
        title,
        text: `${title}: ${text.slice(0, 700)}`,
        url: NOTES_REPO_URL,
      });
    }
    buf = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const h = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      flush();
      title = h[2].replace(/[*_`]/g, "").trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

async function getNotesChunks(): Promise<KnowledgeChunk[]> {
  if (notesChunks.length && Date.now() - notesFetchedAt < NOTES_TTL_MS) {
    return notesChunks;
  }
  try {
    const notes = await getSystemDesignNotes();
    if (notes.ok && notes.markdown) {
      notesChunks = chunkNotes(notes.markdown);
      notesFetchedAt = Date.now();
    }
  } catch {
    /* notes are optional grounding */
  }
  return notesChunks;
}

function scoreChunk(queryTokens: string[], chunk: KnowledgeChunk): number {
  if (queryTokens.length === 0) return 0;
  const titleTokens = new Set(tokenize(chunk.title));
  const bodyTokens = new Set(tokenize(chunk.text));
  let score = 0;
  for (const qt of queryTokens) {
    if (titleTokens.has(qt)) score += 3;
    else if (bodyTokens.has(qt)) score += 1;
  }
  return score;
}

export interface RetrievalOptions {
  k?: number;
  /** Restrict to certain kinds (e.g. only notes for a system-design question). */
  kinds?: KnowledgeKind[];
}

/**
 * Return the top-k most relevant knowledge chunks for a free-text query.
 * Pure lexical scoring; safe to call on every message (sub-millisecond after
 * the corpus is warm).
 */
export async function retrieveKnowledge(
  query: string,
  options: RetrievalOptions = {}
): Promise<KnowledgeChunk[]> {
  const k = options.k ?? 5;
  const queryTokens = Array.from(new Set(tokenize(query)));
  if (queryTokens.length === 0) return [];

  const corpus = [...buildStaticChunks(), ...(await getNotesChunks())];
  const pool = options.kinds
    ? corpus.filter((c) => options.kinds!.includes(c.kind))
    : corpus;

  const scored = pool
    .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map((s) => s.chunk);
}

/** Format retrieved chunks into a compact reference block for the prompt. */
export function renderKnowledgeBlock(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "";
  const lines = chunks.map((c) => {
    const tag = c.kind.toUpperCase();
    const link = c.url ? ` <${c.url}>` : "";
    return `- [${tag}] ${c.text}${link}`;
  });
  return lines.join("\n");
}
