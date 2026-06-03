"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ListChecks,
  ArrowRight,
  Star,
  Plus,
  Check,
  Loader2,
  Pin,
  Layers,
} from "lucide-react";
import type { SheetSummary } from "@/lib/sheets";

interface Props {
  summaries: SheetSummary[];
  completedBySlug: Record<string, number>;
  initialFocus: string[];
}

export default function SheetsBrowser({
  summaries,
  completedBySlug,
  initialFocus,
}: Props) {
  const [focus, setFocus] = useState<Set<string>>(() => new Set(initialFocus));
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  const summaryBySlug = useMemo(
    () => new Map(summaries.map((s) => [s.slug, s])),
    [summaries]
  );

  const focusSheets = useMemo(
    () =>
      Array.from(focus)
        .map((slug) => summaryBySlug.get(slug))
        .filter((s): s is SheetSummary => Boolean(s)),
    [focus, summaryBySlug]
  );

  const toggleFocus = async (slug: string) => {
    if (pending.has(slug)) return;
    const isFocused = focus.has(slug);

    setFocus((prev) => {
      const next = new Set(prev);
      if (isFocused) next.delete(slug);
      else next.add(slug);
      return next;
    });
    setPending((prev) => new Set(prev).add(slug));

    try {
      const res = await fetch("/api/sheets/focus", {
        method: isFocused ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetSlug: slug }),
      });
      if (!res.ok) throw new Error("focus update failed");
    } catch {
      // Revert on failure.
      setFocus((prev) => {
        const next = new Set(prev);
        if (isFocused) next.add(slug);
        else next.delete(slug);
        return next;
      });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 items-start">
      {/* LEFT: Focus sheets */}
      <section className="bg-card border border-border rounded-2xl p-5 lg:sticky lg:top-24">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <h2 className="font-black text-sm text-foreground">
            Your Focus Sheets
          </h2>
          <span className="ml-auto text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {focusSheets.length}
          </span>
        </div>

        {focusSheets.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Pin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              No focus sheets yet. Add sheets from the right to pin the ones
              you&apos;re actively grinding here for quick access.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {focusSheets.map((s) => {
              const done = completedBySlug[s.slug] || 0;
              const pct = s.total > 0 ? Math.round((done / s.total) * 100) : 0;
              const busy = pending.has(s.slug);
              return (
                <div
                  key={s.slug}
                  className="group bg-background border border-border rounded-xl p-4 hover:border-indigo-500/50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/sheets/${s.slug}`}
                      className="min-w-0 flex-1"
                    >
                      <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-500 transition truncate">
                        {s.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {done} / {s.total} solved · {pct}%
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFocus(s.slug)}
                      disabled={busy}
                      title="Remove from focus"
                      className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition shrink-0"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                      )}
                    </button>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* RIGHT: All sheets */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-indigo-500" />
          <h2 className="font-black text-sm text-foreground">All Sheets</h2>
          <span className="ml-auto text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {summaries.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summaries.map((s) => {
            const done = completedBySlug[s.slug] || 0;
            const pct = s.total > 0 ? Math.round((done / s.total) * 100) : 0;
            const isFocused = focus.has(s.slug);
            const busy = pending.has(s.slug);
            return (
              <div
                key={s.slug}
                className="group bg-card border border-border rounded-2xl p-5 hover:border-indigo-500/50 hover:shadow-md transition flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/sheets/${s.slug}`} className="min-w-0 flex-1">
                    <h3 className="font-black text-base text-foreground group-hover:text-indigo-500 transition truncate">
                      {s.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      {s.total} problems · {s.sectionCount} sections
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFocus(s.slug)}
                    disabled={busy}
                    title={isFocused ? "Remove from focus" : "Add to focus"}
                    className={`inline-flex items-center gap-1 shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      isFocused
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "border border-border text-muted-foreground hover:border-indigo-500/50 hover:text-foreground"
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isFocused ? (
                      <>
                        <Check className="w-3 h-3" /> Focused
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> Focus
                      </>
                    )}
                  </button>
                </div>

                {s.description && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                    {s.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-4 text-[10px] font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {s.difficultyCounts.easy} Easy
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-500">
                    {s.difficultyCounts.medium} Med
                  </span>
                  <span className="text-rose-600 dark:text-rose-400">
                    {s.difficultyCounts.hard} Hard
                  </span>
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-muted-foreground">
                      {done} / {s.total} solved
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <Link
                  href={`/sheets/${s.slug}`}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:gap-2.5 transition-all"
                >
                  Open sheet <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
