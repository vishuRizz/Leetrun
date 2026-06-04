"use client";

import React, { useEffect, useRef, useState } from "react";
import { Timer, X, Play, Pause, Loader2, Check } from "lucide-react";
import { useGuest } from "@/components/GuestProvider";

interface Props {
  problemRef: string;
  title: string;
  difficulty?: "easy" | "medium" | "hard" | string;
  className?: string;
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const CONFIDENCE: { key: "EASY" | "OK" | "HARD"; label: string; cls: string }[] = [
  { key: "EASY", label: "Easy 😎", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { key: "OK", label: "OK 🙂", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { key: "HARD", label: "Hard 😓", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" },
];

export default function SolveTimerButton({
  problemRef,
  title,
  difficulty,
  className = "",
}: Props) {
  const { isGuest, promptSignup } = useGuest();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running]);

  const openTimer = () => {
    if (isGuest) {
      promptSignup("the solve timer");
      return;
    }
    setElapsed(0);
    setRunning(true);
    setDone(false);
    setOpen(true);
  };

  const close = () => {
    setRunning(false);
    setOpen(false);
    setElapsed(0);
    setDone(false);
  };

  const finish = async (confidence: "EASY" | "OK" | "HARD") => {
    setRunning(false);
    setSaving(true);
    try {
      await fetch("/api/solve-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemRef, title, difficulty, seconds: elapsed, confidence }),
      });
      setDone(true);
      setTimeout(close, 900);
    } catch {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openTimer}
        title="Practice timer"
        className={`p-1.5 rounded-md shrink-0 text-muted-foreground hover:text-sky-500 hover:bg-muted transition ${className}`}
      >
        <Timer className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={() => !saving && close()}
        >
          <div
            className="w-full max-w-xs bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <Timer className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Solve timer
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground mt-1 truncate">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={close}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              {done ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <span className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </span>
                  <p className="text-sm font-bold">Saved · {fmt(elapsed)}</p>
                </div>
              ) : (
                <>
                  <div className="text-5xl font-black font-mono tabular-nums text-foreground">
                    {fmt(elapsed)}
                  </div>

                  <button
                    type="button"
                    onClick={() => setRunning((r) => !r)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition"
                  >
                    {running ? (
                      <>
                        <Pause className="w-4 h-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Resume
                      </>
                    )}
                  </button>

                  <div className="w-full pt-1">
                    <p className="text-[11px] text-center text-muted-foreground mb-2 font-medium">
                      Done? How did it feel?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {CONFIDENCE.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          disabled={saving}
                          onClick={() => void finish(c.key)}
                          className={`text-xs font-bold border rounded-lg py-2 transition disabled:opacity-60 ${c.cls}`}
                        >
                          {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                          ) : (
                            c.label
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
