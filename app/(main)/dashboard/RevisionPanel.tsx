"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Dices, Info, Loader2 } from "lucide-react";

type Difficulty = "ANY" | "EASY" | "MEDIUM" | "HARD";
type SolvedFilter = "any" | "unsolved" | "solved";

interface Options {
  topics: string[];
  solvedCount: number;
  hasSolveData: boolean;
}

interface Props {
  onGenerated: () => void | Promise<void>;
  onCancel?: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string; cls: string }[] = [
  { id: "ANY", label: "Any", cls: "text-foreground" },
  { id: "EASY", label: "Easy", cls: "text-emerald-600 dark:text-emerald-400" },
  { id: "MEDIUM", label: "Medium", cls: "text-yellow-600 dark:text-yellow-500" },
  { id: "HARD", label: "Hard", cls: "text-rose-600 dark:text-rose-400" },
];

const SOLVED_FILTERS: { id: SolvedFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "unsolved", label: "Not done yet" },
  { id: "solved", label: "Already solved" },
];

export default function RevisionPanel({ onGenerated, onCancel }: Props) {
  const [options, setOptions] = useState<Options | null>(null);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<Difficulty>("ANY");
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>("any");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/revision");
        if (!res.ok) return;
        const json = await res.json();
        if (active)
          setOptions({
            topics: json.topics || [],
            solvedCount: json.solvedCount || 0,
            hasSolveData: !!json.hasSolveData,
          });
      } catch {
        /* noop */
      } finally {
        if (active) setLoadingOpts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggleTopic = (t: string) => {
    setTopics((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: Array.from(topics),
          difficulty,
          solvedFilter,
          count,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not generate a question.");
        return;
      }
      await onGenerated();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-50 via-background to-background dark:from-indigo-950/30 dark:via-card dark:to-card p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-black text-sm text-foreground">
            Build your revision
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Pick your topics, difficulty, and whether you want fresh problems or
            ones you&apos;ve already solved. We&apos;ll drop a random question for
            you to solve and earn XP.
          </p>
        </div>
      </div>

      {/* Topics */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Topics{" "}
          <span className="font-medium normal-case text-muted-foreground/70">
            (leave empty for a mix of everything)
          </span>
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {loadingOpts && (
            <span className="text-xs text-muted-foreground">
              Loading topics…
            </span>
          )}
          {options?.topics.map((t) => {
            const active = topics.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTopic(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  active
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-card border-border text-muted-foreground hover:border-indigo-500/50 hover:text-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Difficulty
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                  active
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : `bg-card border-border ${d.cls} hover:border-indigo-500/40`
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solved filter */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Completion
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {SOLVED_FILTERS.map((f) => {
            const active = solvedFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSolvedFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                  active
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "bg-card border-border text-muted-foreground hover:border-indigo-500/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {!loadingOpts &&
          options &&
          !options.hasSolveData &&
          solvedFilter !== "any" && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              We don&apos;t have your solve history yet. Run a Deep Sync from your
              profile so we know what you&apos;ve done — otherwise this filter
              may find nothing.
            </p>
          )}
        {!loadingOpts && options && options.hasSolveData && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {options.solvedCount} solved problems on record.
          </p>
        )}
      </div>

      {/* Count */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          How many questions
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {[1, 2, 3, 5].map((n) => {
            const active = count === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`w-10 py-1.5 rounded-lg text-xs font-black border transition ${
                  active
                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "bg-card border-border text-muted-foreground hover:border-indigo-500/40"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="text-xs font-medium rounded-lg px-3 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || loadingOpts}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Dices className="w-4 h-4" />
          )}
          Generate random {count === 1 ? "question" : "questions"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-bold text-muted-foreground hover:text-foreground transition"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
