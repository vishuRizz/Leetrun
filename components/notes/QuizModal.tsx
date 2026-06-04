"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Loader2, Check, Sparkles, RotateCw } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export default function QuizModal({
  open,
  topic,
  onClose,
}: {
  open: boolean;
  topic: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});

  const fetchQuiz = useCallback(async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelected({});
    try {
      const res = await fetch("/api/notes/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz.");
      setQuestions(data.questions || []);
    } catch (e: any) {
      setError(e?.message || "Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => {
    if (open && topic) void fetchQuiz();
  }, [open, topic, fetchQuiz]);

  if (!open) return null;

  const answeredCount = Object.keys(selected).length;
  const score = questions.reduce(
    (s, q, i) => s + (selected[i] === q.answerIndex ? 1 : 0),
    0
  );
  const allAnswered =
    questions.length > 0 && answeredCount === questions.length;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[8vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[84vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                AI Quiz
              </span>
            </div>
            <h3 className="font-bold text-sm text-foreground mt-1 truncate">
              Test me on {topic}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
              Generating questions on {topic}…
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center">
              <p className="text-sm text-rose-500">{error}</p>
              <button
                type="button"
                onClick={() => void fetchQuiz()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
              >
                <RotateCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            questions.map((q, qi) => {
              const chosen = selected[qi];
              const answered = chosen !== undefined;
              return (
                <div key={qi} className="space-y-2.5">
                  <p className="text-sm font-semibold text-foreground">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const isCorrect = oi === q.answerIndex;
                      const isChosen = chosen === oi;
                      let cls =
                        "border-border bg-background hover:border-indigo-500/50";
                      if (answered) {
                        if (isCorrect)
                          cls =
                            "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                        else if (isChosen)
                          cls =
                            "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300";
                        else cls = "border-border opacity-60";
                      }
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={answered}
                          onClick={() =>
                            setSelected((prev) => ({ ...prev, [qi]: oi }))
                          }
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition flex items-center gap-2 ${cls}`}
                        >
                          <span className="flex-1">{opt}</span>
                          {answered && isCorrect && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {answered && q.explanation && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
        </div>

        {!loading && !error && questions.length > 0 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between gap-3 shrink-0">
            <span className="text-sm font-bold text-foreground">
              {allAnswered ? (
                <>Score: {score}/{questions.length}</>
              ) : (
                <span className="text-muted-foreground font-medium">
                  {answeredCount}/{questions.length} answered
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => void fetchQuiz()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted text-xs font-bold transition"
            >
              <RotateCw className="w-3.5 h-3.5" /> New quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
