"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  Copy,
  Check,
  Lightbulb,
  Code2,
  Flame,
} from "lucide-react";
import type { PatternTemplate } from "@/lib/patterns/templates";

interface Props {
  templates: PatternTemplate[];
}

const FREQUENCY_STYLES: Record<string, string> = {
  very_high: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
  high: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
  medium: "text-yellow-600 dark:text-yellow-500 bg-yellow-500/10",
  low: "text-muted-foreground bg-muted",
};

const DIFF_STYLES: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  medium: "text-yellow-600 dark:text-yellow-500 bg-yellow-500/10",
  hard: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
};

function freqLabel(f: string): string {
  return f.replace(/_/g, " ");
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-[#0d1117]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#161b22]">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
          <Code2 className="w-3.5 h-3.5" /> C++
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-300 hover:text-white transition px-2 py-1 rounded-md hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12.5px] leading-relaxed text-gray-100 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function TemplatesBrowser({ templates }: Props) {
  const [open, setOpen] = useState<Set<number>>(
    () => new Set(templates.length > 0 ? [templates[0].id] : [])
  );
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.pattern.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.useCases.some((u) => u.toLowerCase().includes(q)) ||
        t.problems.some((p) => p.title.toLowerCase().includes(q))
    );
  }, [templates, q]);

  const toggle = (id: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates, tags, or problems…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/60"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((t) => {
          const isOpen = open.has(t.id) || Boolean(q);
          return (
            <div
              key={t.id}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-muted/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-foreground">
                      {t.pattern}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                        FREQUENCY_STYLES[t.frequency] || FREQUENCY_STYLES.low
                      }`}
                    >
                      {t.frequency === "very_high" && (
                        <Flame className="w-3 h-3" />
                      )}
                      {freqLabel(t.frequency)}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                        DIFF_STYLES[t.difficulty] || DIFF_STYLES.medium
                      }`}
                    >
                      {t.difficulty}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 sm:px-5 py-4 space-y-5">
                  {/* Use cases */}
                  {t.useCases.length > 0 && (
                    <div>
                      <h4 className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-foreground mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> When
                        to use
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {t.useCases.map((u) => (
                          <span
                            key={u}
                            className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
                          >
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template code */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wide text-foreground mb-2">
                      Template
                    </h4>
                    <CodeBlock code={t.template} />
                  </div>

                  {/* Practice problems */}
                  {t.problems.length > 0 && (
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-foreground mb-2">
                        Practice problems
                      </h4>
                      <div className="flex flex-col divide-y divide-border/60">
                        {t.problems.map((p) => (
                          <a
                            key={`${t.id}-${p.leetcodeId}`}
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 py-2 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition"
                          >
                            <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              {p.leetcodeId}
                            </span>
                            <span className="min-w-0 flex-1 text-sm text-foreground group-hover:text-indigo-500 transition truncate">
                              {p.title}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            No templates match “{query}”.
          </div>
        )}
      </div>
    </div>
  );
}
