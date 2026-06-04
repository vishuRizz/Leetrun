"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  Flame,
  Check,
} from "lucide-react";
import type { PatternFamily } from "@/lib/patterns";

interface Props {
  families: PatternFamily[];
  total: number;
  solvedSlugs?: string[];
}

const DIFF_STYLES: Record<string, string> = {
  EASY: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  MEDIUM: "text-yellow-600 dark:text-yellow-500 bg-yellow-500/10",
  HARD: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
};

export default function PatternsBrowser({
  families,
  total,
  solvedSlugs = [],
}: Props) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(families.length > 0 ? [families[0].name] : [])
  );
  const [query, setQuery] = useState("");

  const solvedSet = useMemo(
    () => new Set(solvedSlugs.map((s) => s.toLowerCase())),
    [solvedSlugs]
  );
  const isSolved = (slug: string) => solvedSet.has(slug.toLowerCase());
  const hasProgress = solvedSet.size > 0;

  const q = query.trim().toLowerCase();

  // Solved counts per family and per pattern, computed from the FULL data set
  // (not the search-filtered view) so the progress numbers stay accurate.
  const solvedStats = useMemo(() => {
    const fam: Record<string, number> = {};
    const pat: Record<string, number> = {};
    for (const f of families) {
      let fc = 0;
      for (const pg of f.patterns) {
        let pc = 0;
        for (const qq of pg.questions) {
          if (solvedSet.has(qq.slug.toLowerCase())) {
            pc += 1;
            fc += 1;
          }
        }
        pat[`${f.name}::${pg.pattern}`] = pc;
      }
      fam[f.name] = fc;
    }
    return { fam, pat };
  }, [families, solvedSet]);

  const filtered = useMemo(() => {
    if (!q) return families;
    return families
      .map((fam) => {
        const patterns = fam.patterns
          .map((pg) => ({
            ...pg,
            questions: pg.questions.filter(
              (qq) =>
                qq.title.toLowerCase().includes(q) ||
                pg.pattern.toLowerCase().includes(q) ||
                fam.name.toLowerCase().includes(q)
            ),
          }))
          .filter((pg) => pg.questions.length > 0);
        return { ...fam, patterns };
      })
      .filter((fam) => fam.patterns.length > 0);
  }, [families, q]);

  const toggle = (name: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const maxCount = families.reduce((m, f) => Math.max(m, f.count), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns or problems…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/60"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((fam, idx) => {
          const isOpen = open.has(fam.name) || Boolean(q);
          const barPct = Math.round((fam.count / maxCount) * 100);
          const famDone = solvedStats.fam[fam.name] || 0;
          const famPct = fam.count > 0 ? Math.round((famDone / fam.count) * 100) : 0;
          return (
            <div
              key={fam.name}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggle(fam.name)}
                className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-muted/40 transition"
              >
                <span className="shrink-0 w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                  {idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base text-foreground truncate">
                      {fam.name}
                    </h3>
                    {idx < 3 && (
                      <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    )}
                  </div>
                  {/* weightage bar (with solved progress overlaid) */}
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  {hasProgress && (
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${famPct}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {fam.easy} E
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-500">
                      {fam.medium} M
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">
                      {fam.hard} H
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {fam.weightage}%
                  </div>
                  {hasProgress ? (
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {famDone}/{fam.count} done
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
                      {fam.count} Qs
                    </div>
                  )}
                </div>

                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 sm:px-5 py-4 space-y-5">
                  {fam.patterns.map((pg) => {
                    const patDone = solvedStats.pat[`${fam.name}::${pg.pattern}`] || 0;
                    return (
                    <div key={pg.pattern}>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                          {pg.pattern}
                        </h4>
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {hasProgress ? `${patDone}/${pg.count}` : pg.count}
                        </span>
                      </div>
                      <div className="flex flex-col divide-y divide-border/60">
                        {pg.questions.map((qq) => {
                          const solved = isSolved(qq.slug);
                          return (
                          <a
                            key={qq.id}
                            href={`https://leetcode.com/problems/${qq.slug}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 py-2 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition"
                          >
                            {solved ? (
                              <span
                                className="shrink-0 w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center"
                                title="Solved"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span
                                className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  DIFF_STYLES[qq.difficulty]
                                }`}
                              >
                                {qq.difficulty[0]}
                              </span>
                            )}
                            <span
                              className={`min-w-0 flex-1 text-sm group-hover:text-indigo-500 transition truncate ${
                                solved
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {qq.lcNumber ? `${qq.lcNumber}. ` : ""}
                              {qq.title}
                            </span>
                            {qq.companies.length > 0 && (
                              <span className="hidden sm:block shrink-0 text-[10px] text-muted-foreground truncate max-w-[160px]">
                                {qq.companies.slice(0, 3).join(", ")}
                              </span>
                            )}
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition" />
                          </a>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            No patterns or problems match “{query}”.
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Weightage is the share of {total} curated interview questions that use
        each pattern.
      </p>
    </div>
  );
}
