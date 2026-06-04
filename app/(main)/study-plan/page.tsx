"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Loader2,
  ExternalLink,
  Check,
  Target,
  Save,
  Sparkles,
} from "lucide-react";
import ProblemNoteButton from "@/components/ProblemNoteButton";

interface PlanProblem {
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  sheetSlug: string;
  sheetName: string;
  topic: string;
  solved: boolean;
}
interface PlanDay {
  date: string;
  focusTopics: string[];
  problems: PlanProblem[];
}
interface PlanResponse {
  interviewDate: string | null;
  dailyTarget: number;
  daysUntil: number | null;
  plan: { days: PlanDay[]; totalProblems: number; solvedProblems: number };
}

const DIFF: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default function StudyPlanPage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [targetDraft, setTargetDraft] = useState(3);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/study-plan");
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) throw new Error();
      const json = (await res.json()) as PlanResponse;
      setData(json);
      setDateDraft(json.interviewDate ? json.interviewDate.slice(0, 10) : "");
      setTargetDraft(json.dailyTarget || 3);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewDate: dateDraft, dailyTarget: targetDraft }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-2 sticky top-0 z-40">
        <CalendarClock className="w-5 h-5 text-indigo-500" />
        <h1 className="font-extrabold text-xl">Study Plan</h1>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {needsAuth ? (
          <section className="bg-card border border-border rounded-2xl p-10 text-center">
            <CalendarClock className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <h2 className="font-bold text-lg">Build your interview study plan</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Set your interview date and get a day-by-day plan that front-loads
              your weakest topics and auto-tracks as you solve.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 mt-5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition"
            >
              Log in to start
            </Link>
          </section>
        ) : (
        <>
        {/* Settings */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" /> Interview date
              </label>
              <input
                type="date"
                value={dateDraft}
                min={todayKey}
                onChange={(e) => setDateDraft(e.target.value)}
                className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="text-xs font-bold text-muted-foreground">
                Problems / day
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={targetDraft}
                onChange={(e) => setTargetDraft(Number(e.target.value))}
                className="mt-1.5 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-bold transition"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </section>

        {loading ? (
          <div className="py-20 flex flex-col items-center text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            Building your plan…
          </div>
        ) : data ? (
          <>
            {/* Summary */}
            <section className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black text-foreground">
                    {data.daysUntil != null
                      ? data.daysUntil > 0
                        ? `${data.daysUntil} days to go`
                        : "Interview day! 🎯"
                      : "No date set"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {data.daysUntil != null
                      ? `${data.dailyTarget} problems/day · weak topics first`
                      : "Set an interview date to get a countdown. Showing a 2-week plan."}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {data.plan.solvedProblems}/{data.plan.totalProblems}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    done
                  </div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{
                    width: `${
                      data.plan.totalProblems > 0
                        ? Math.round(
                            (data.plan.solvedProblems / data.plan.totalProblems) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </section>

            {/* Day cards */}
            <div className="space-y-4">
              {data.plan.days.map((day, i) => {
                const dayDone = day.problems.filter((p) => p.solved).length;
                const isToday = day.date === todayKey;
                const dateObj = new Date(day.date + "T00:00:00");
                return (
                  <section
                    key={day.date}
                    className={`bg-card border rounded-2xl overflow-hidden ${
                      isToday ? "border-indigo-500/50" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold flex items-center gap-2">
                            {dateObj.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                            {isToday && (
                              <span className="text-[9px] font-black uppercase bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {day.focusTopics.join(" · ")}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold font-mono text-muted-foreground shrink-0">
                        {dayDone}/{day.problems.length}
                      </span>
                    </div>
                    <div className="divide-y divide-border/60">
                      {day.problems.map((p) => (
                        <div
                          key={p.slug}
                          className={`flex items-center gap-3 px-5 py-2.5 ${
                            p.solved ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          {p.solved ? (
                            <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${DIFF[p.difficulty]}`}
                            >
                              {p.difficulty[0].toUpperCase()}
                            </span>
                          )}
                          <span
                            className={`flex-1 min-w-0 text-sm truncate ${
                              p.solved ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {p.title}
                          </span>
                          <span className="hidden sm:block text-[10px] text-muted-foreground shrink-0">
                            {p.topic}
                          </span>
                          <ProblemNoteButton problemRef={p.slug.toLowerCase()} title={p.title} />
                          <a
                            href={`https://leetcode.com/problems/${p.slug}/`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-muted transition shrink-0"
                            title="Open problem"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Problems auto-check off as you sync solves. Plan adapts to your weak
              topics.
            </p>
            <div className="text-center">
              <Link
                href="/analytics"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                See your weak topics →
              </Link>
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-muted-foreground text-sm">
            Couldn&apos;t build a plan. Try syncing your LeetCode account first.
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}
