import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { BookOpen, ExternalLink, Network } from "lucide-react";
import NotesToc from "@/components/notes/NotesToc";
import {
  getSystemDesignNotes,
  resolveNotesUrl,
  NOTES_REPO,
  NOTES_REPO_URL,
} from "@/lib/notes/system-design";

export const revalidate = 3600;

export const metadata = {
  title: "System Design Notes | LeetRun",
  description:
    "A complete, beautifully formatted system design course - networking, databases, distributed systems, and real-world interview case studies.",
};

// react-markdown passes a `node` prop we don't want forwarded onto DOM nodes.
function stripNode<T extends Record<string, unknown>>(props: T) {
  const { node: _ignored, ...rest } = props as T & { node?: unknown };
  void _ignored;
  return rest;
}

const markdownComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  img(props: any) {
    const { alt, ...rest } = stripNode(props);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...rest} alt={(alt as string) || ""} loading="lazy" />
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a(props: any) {
    const { href, children, ...rest } = stripNode(props);
    const external = typeof href === "string" && /^https?:/i.test(href);
    return (
      <a
        href={href as string | undefined}
        {...rest}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children as React.ReactNode}
      </a>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table(props: any) {
    const { children, ...rest } = stripNode(props);
    return (
      <div className="notes-table-wrap">
        <table {...rest}>{children as React.ReactNode}</table>
      </div>
    );
  },
};

export default async function NotesPage() {
  const { markdown, toc, ok } = await getSystemDesignNotes();

  return (
    <div className="min-h-screen">
      {/* Hero band */}
      <div className="border-b border-border bg-gradient-to-b from-indigo-500/[0.07] to-transparent">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
                <BookOpen className="w-3.5 h-3.5" />
                Learn
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight">
                System Design
              </h1>
              <p className="mt-3 text-muted-foreground text-sm md:text-base leading-relaxed">
                A complete, hand-crafted system design course - from IP, DNS and
                load balancing to databases, distributed systems and full
                real-world case studies like WhatsApp, Twitter, Netflix and
                Uber.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center w-28 h-28 rounded-3xl bg-indigo-500/10 text-indigo-500 shrink-0">
              <Network className="w-12 h-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 flex gap-8 items-start">
        {ok && toc.length > 0 && <NotesToc toc={toc} />}

        <article className="notes-prose min-w-0 flex-1 max-w-3xl">
          {ok ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSlug]}
              urlTransform={resolveNotesUrl}
              components={markdownComponents}
            >
              {markdown}
            </ReactMarkdown>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <h2 className="text-lg font-bold">Notes are taking a break</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn&apos;t load the notes right now. You can read them
                directly on GitHub in the meantime.
              </p>
              <a
                href={NOTES_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                Open on GitHub
              </a>
            </div>
          )}

          {ok && (
            <p className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
              Synced from{" "}
              <a
                href={NOTES_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                github.com/{NOTES_REPO}
              </a>
              . Updates to the repo appear here automatically.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
