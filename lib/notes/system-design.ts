import GithubSlugger from "github-slugger";

/**
 * Source of the System Design notes. The notes live as a single large
 * README.md in the founder's public GitHub repo, so we fetch + render it
 * directly rather than copying the content into the codebase. This keeps the
 * in-app notes in sync with the repo whenever it's updated.
 */
export const NOTES_REPO = "vishuRizz/system-design-notes";
export const NOTES_REPO_URL = `https://github.com/${NOTES_REPO}`;
export const NOTES_RAW_README = `https://raw.githubusercontent.com/${NOTES_REPO}/main/README.md`;
const NOTES_RAW_BASE = `https://raw.githubusercontent.com/${NOTES_REPO}/main/`;

export interface NotesTocItem {
  title: string;
  slug: string;
}

export interface SystemDesignNotes {
  markdown: string;
  toc: NotesTocItem[];
  ok: boolean;
}

/**
 * Resolve a (possibly relative) markdown URL against the repo so that any
 * relative images/links continue to work once rendered inside the app.
 * Absolute URLs and in-page anchors are returned untouched.
 */
export function resolveNotesUrl(url: string | undefined): string {
  if (!url) return "";
  if (/^(https?:|mailto:|#)/i.test(url)) return url;
  return NOTES_RAW_BASE + url.replace(/^\.?\//, "");
}

/**
 * Build the table of contents from the markdown. We run github-slugger over
 * EVERY heading in document order (exactly what rehype-slug does internally)
 * so the slugs we generate are guaranteed to match the `id`s rehype-slug puts
 * on the rendered headings. We then keep only the top-level (`#`) topics for a
 * clean, scannable sidebar.
 */
function buildToc(markdown: string): NotesTocItem[] {
  const slugger = new GithubSlugger();
  const toc: NotesTocItem[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    // Strip inline markdown emphasis/code markers from the visible title.
    const title = match[2].replace(/[*_`]/g, "").trim();
    const slug = slugger.slug(title);

    if (level === 1) toc.push({ title, slug });
  }

  return toc;
}

/**
 * Trim the repo's own title + "Table of contents" block so we don't render a
 * giant duplicate TOC (we build our own interactive one). Starts the content
 * at the first real topic heading.
 */
function trimFrontMatter(markdown: string): string {
  const lines = markdown.split("\n");
  const startIdx = lines.findIndex((l) =>
    /^#\s+What is system design/i.test(l)
  );
  if (startIdx > 0) return lines.slice(startIdx).join("\n");
  return markdown;
}

export async function getSystemDesignNotes(): Promise<SystemDesignNotes> {
  try {
    const res = await fetch(NOTES_RAW_README, {
      // Cache the notes for an hour - they change rarely and the file is large.
      next: { revalidate: 3600 },
      headers: { Accept: "text/plain" },
    });

    if (!res.ok) {
      return { markdown: "", toc: [], ok: false };
    }

    const raw = await res.text();
    const markdown = trimFrontMatter(raw);
    const toc = buildToc(markdown);

    return { markdown, toc, ok: true };
  } catch {
    return { markdown: "", toc: [], ok: false };
  }
}
