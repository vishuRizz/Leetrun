"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowLeft,
  ChevronDown,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { NormalizedSheet } from "@/lib/sheets";

interface Props {
  sheet: NormalizedSheet;
  initialCompleted: string[];
}

const DIFF_STYLES: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-yellow-600 dark:text-yellow-500",
  hard: "text-rose-600 dark:text-rose-400",
};

export default function SheetView({ sheet, initialCompleted }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompleted)
  );
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  // Bucket sections into "steps" using their `group` label. Sheets without
  // groups (SDE, 79) collapse into a single anonymous step so we can render
  // everything through one code path.
  const groups = useMemo(() => {
    const result: {
      id: string;
      title: string | null;
      sections: NormalizedSheet["sections"];
    }[] = [];
    for (const section of sheet.sections) {
      const key = section.group;
      const last = result[result.length - 1];
      if (last && last.title === key) {
        last.sections.push(section);
      } else {
        result.push({
          id: `group-${result.length}`,
          title: key,
          sections: [section],
        });
      }
    }
    return result;
  }, [sheet]);

  const hasSteps = groups.some((g) => g.title !== null);

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(groups.length > 0 ? [groups[0].id] : [])
  );
  const [openSections, setOpenSections] = useState<Set<string>>(
    () =>
      new Set(
        // Without steps, open the first section by default; with steps the
        // first step is expanded and its sections start open.
        hasSteps
          ? groups[0]?.sections.map((s) => s.id) ?? []
          : sheet.sections.length > 0
          ? [sheet.sections[0].id]
          : []
      )
  );

  const totalProblems = useMemo(
    () => sheet.sections.reduce((n, s) => n + s.problems.length, 0),
    [sheet]
  );
  const doneCount = completed.size;
  const pct = totalProblems > 0 ? Math.round((doneCount / totalProblems) * 100) : 0;

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProblem = async (key: string) => {
    if (pending.has(key)) return;
    const isDone = completed.has(key);
    const nextCompleted = !isDone;

    // Optimistic update.
    setCompleted((prev) => {
      const next = new Set(prev);
      if (nextCompleted) next.add(key);
      else next.delete(key);
      return next;
    });
    setPending((prev) => new Set(prev).add(key));

    try {
      const res = await fetch("/api/sheets/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetSlug: sheet.slug,
          problemKey: key,
          completed: nextCompleted,
        }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      // Revert on failure.
      setCompleted((prev) => {
        const next = new Set(prev);
        if (nextCompleted) next.delete(key);
        else next.add(key);
        return next;
      });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const problemUrl = (p: NormalizedSheet["sections"][number]["problems"][number]) => {
    if (p.leetcodeSlug) return `https://leetcode.com/problems/${p.leetcodeSlug}/`;
    if (p.gfgSlug) return `https://www.geeksforgeeks.org/problems/${p.gfgSlug}/`;
    return null;
  };

  const renderSection = (
    section: NormalizedSheet["sections"][number],
    nested: boolean
  ) => {
    const isOpen = openSections.has(section.id);
    const sectionDone = section.problems.filter((p) =>
      completed.has(p.key)
    ).length;
    return (
      <div
        key={section.id}
        className={
          nested
            ? "overflow-hidden"
            : "bg-card border border-border rounded-xl overflow-hidden"
        }
      >
        <button
          type="button"
          onClick={() => toggleSection(section.id)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition text-left"
        >
          <div className="font-bold text-sm text-foreground truncate min-w-0">
            {section.title}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-[11px] font-bold font-mono ${
                sectionDone === section.problems.length
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {sectionDone}/{section.problems.length}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {isOpen && (
          <div className="divide-y divide-border/60 border-t border-border">
            {section.problems.map((p) => {
              const isDone = completed.has(p.key);
              const isPending = pending.has(p.key);
              const url = problemUrl(p);
              return (
                <div
                  key={p.key}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    isDone ? "bg-emerald-500/5" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleProblem(p.key)}
                    disabled={isPending}
                    title={isDone ? "Mark as not done" : "Mark as done"}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                      isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-background border-border hover:border-indigo-500"
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : isDone ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : null}
                  </button>

                  <span
                    className={`flex-1 text-sm min-w-0 truncate ${
                      isDone
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {p.title}
                  </span>

                  <span
                    className={`text-[10px] font-bold uppercase shrink-0 ${
                      DIFF_STYLES[p.difficulty]
                    }`}
                  >
                    {p.difficulty}
                  </span>

                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-muted transition shrink-0"
                      title="Open problem"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="w-7 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/sheets"
            className="p-2 rounded-lg bg-muted hover:bg-muted/70 border border-border transition shrink-0"
            title="All sheets"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-base sm:text-lg truncate flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
              {sheet.name}
            </h1>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              {pct}%
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {doneCount}/{totalProblems}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        {hasSteps
          ? groups.map((group) => {
              const groupOpen = openGroups.has(group.id);
              const groupTotal = group.sections.reduce(
                (n, s) => n + s.problems.length,
                0
              );
              const groupDone = group.sections.reduce(
                (n, s) =>
                  n + s.problems.filter((p) => completed.has(p.key)).length,
                0
              );
              const groupPct =
                groupTotal > 0
                  ? Math.round((groupDone / groupTotal) * 100)
                  : 0;

              return (
                <div
                  key={group.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/30 transition text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-black text-base text-foreground truncate">
                        {group.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {group.sections.length} topic
                        {group.sections.length !== 1 ? "s" : ""} · {groupTotal}{" "}
                        problems
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                          {groupPct}%
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {groupDone}/{groupTotal}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform ${
                          groupOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {groupOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {group.sections.map((section) =>
                        renderSection(section, true)
                      )}
                    </div>
                  )}
                </div>
              );
            })
          : sheet.sections.map((section) => renderSection(section, false))}
      </main>
    </div>
  );
}
