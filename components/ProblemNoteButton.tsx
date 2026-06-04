"use client";

import React, { useEffect, useRef, useState } from "react";
import { StickyNote, X, Loader2, Trash2, Check } from "lucide-react";
import { useGuest } from "@/components/GuestProvider";

interface Props {
  /** Canonical problem reference (LeetCode slug when available). */
  problemRef: string;
  title: string;
  /**
   * Preloaded note content. Pass it when the parent already knows the note
   * (e.g. sheet page). Omit to lazy-fetch the note the first time it opens.
   */
  initialContent?: string;
  /** Notify parent when the saved content changes (for shared state/UI). */
  onSaved?: (ref: string, content: string) => void;
  className?: string;
}

export default function ProblemNoteButton({
  problemRef,
  title,
  initialContent,
  onSaved,
  className = "",
}: Props) {
  const { isGuest, promptSignup } = useGuest();

  const [content, setContent] = useState(initialContent ?? "");
  const [loaded, setLoaded] = useState(initialContent !== undefined);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasNote = content.trim().length > 0;

  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent);
      setLoaded(true);
    }
  }, [initialContent]);

  const openEditor = async () => {
    if (isGuest) {
      promptSignup("problem notes");
      return;
    }
    setError(null);
    let current = content;
    if (!loaded) {
      try {
        const res = await fetch(
          `/api/notes?ref=${encodeURIComponent(problemRef)}`
        );
        if (res.ok) {
          const data = await res.json();
          current = data.note?.content ?? "";
          setContent(current);
        }
      } catch {
        /* fall back to empty */
      } finally {
        setLoaded(true);
      }
    }
    setDraft(current);
    setOpen(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const save = async (nextContent: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: problemRef, title, content: nextContent }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = nextContent.trim();
      setContent(saved);
      onSaved?.(problemRef, saved);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Could not save note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        title={hasNote ? "Edit note" : "Add note"}
        className={`p-1.5 rounded-md shrink-0 transition ${
          hasNote
            ? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20"
            : "text-muted-foreground hover:text-indigo-500 hover:bg-muted"
        } ${className}`}
      >
        <StickyNote
          className={`w-3.5 h-3.5 ${hasNote ? "fill-indigo-500/20" : ""}`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <StickyNote className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Your note
                  </span>
                </div>
                <h3 className="font-bold text-sm text-foreground mt-1 truncate">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={7}
                maxLength={10000}
                placeholder="Approach, edge cases, time/space complexity, things to remember..."
                className="w-full bg-background border border-border focus:border-indigo-500 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-y leading-relaxed"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void save(draft);
                  }
                }}
              />
              {error && <p className="text-xs text-rose-500">{error}</p>}

              <div className="flex items-center justify-between gap-2">
                {hasNote ? (
                  <button
                    type="button"
                    onClick={() => void save("")}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition disabled:opacity-60"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    ⌘/Ctrl + Enter to save
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !busy && setOpen(false)}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void save(draft)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
