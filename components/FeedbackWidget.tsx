"use client";

import React, { useEffect, useState } from "react";
import { X, Bug, Lightbulb, MessageSquare, Loader2, Check, Send } from "lucide-react";

export const OPEN_FEEDBACK_EVENT = "leetrun:open-feedback";

type FeedbackType = "BUG" | "IDEA" | "OTHER";

const TYPE_OPTIONS: { id: FeedbackType; label: string; icon: typeof Bug }[] = [
  { id: "BUG", label: "Bug", icon: Bug },
  { id: "IDEA", label: "Idea", icon: Lightbulb },
  { id: "OTHER", label: "Other", icon: MessageSquare },
];

/**
 * Global feedback / bug-report modal. It renders nothing until opened via the
 * `leetrun:open-feedback` window event (dispatched from the sidebar and command
 * palette), so it doesn't clutter the UI with another floating button.
 */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("BUG");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setDone(false);
      setError("");
    };
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = async () => {
    if (message.trim().length < 3) {
      setError("Please add a little more detail.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          pageUrl: typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit.");
      }
      setDone(true);
      setMessage("");
      setTimeout(() => setOpen(false), 1600);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" /> Share feedback
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-bold text-sm">Thank you!</p>
            <p className="text-xs text-muted-foreground">
              Your feedback helps make LeetRun better.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition ${
                      active
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
              rows={5}
              maxLength={4000}
              placeholder={
                type === "BUG"
                  ? "What went wrong? What did you expect to happen?"
                  : type === "IDEA"
                  ? "What would make LeetRun better for you?"
                  : "Tell us what's on your mind…"
              }
              className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg px-3 py-2.5 text-sm outline-none transition resize-none"
            />

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-bold py-2.5 rounded-lg transition"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send feedback
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              We capture the current page to help us reproduce issues.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
