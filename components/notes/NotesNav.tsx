"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ListTree, Check, Sparkles, X } from "lucide-react";
import type { NotesTocItem } from "@/lib/notes/system-design";
import { useGuest } from "@/components/GuestProvider";
import QuizModal from "@/components/notes/QuizModal";

function RingProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7 -rotate-90 shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" className="stroke-muted" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-indigo-500 transition-[stroke-dashoffset] duration-300"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

export default function NotesNav({ toc }: { toc: NotesTocItem[] }) {
  const { isGuest, promptSignup } = useGuest();

  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(toc[0]?.slug ?? null);
  const [readSlugs, setReadSlugs] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTopic, setQuizTopic] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return toc;
    return toc.filter((t) => t.title.toLowerCase().includes(q));
  }, [query, toc]);

  const activeTitle = useMemo(
    () => toc.find((t) => t.slug === activeSlug)?.title ?? toc[0]?.title ?? "",
    [toc, activeSlug]
  );

  // Load saved read marks for logged-in users.
  useEffect(() => {
    if (isGuest) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/notes/reading");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.readSlugs)) {
          setReadSlugs(new Set(data.readSlugs));
        }
      } catch {
        /* noop */
      }
    })();
    return () => {
      alive = false;
    };
  }, [isGuest]);

  // Scroll-spy: highlight the topic currently in view.
  useEffect(() => {
    const headings = toc
      .map((t) => document.getElementById(t.slug))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActiveSlug(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  // Keep the active item visible within the desktop nav only.
  useEffect(() => {
    if (!activeSlug || !navRef.current) return;
    const nav = navRef.current;
    const link = nav.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`);
    if (!link) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    if (linkRect.top < navRect.top || linkRect.bottom > navRect.bottom) {
      nav.scrollTop +=
        linkRect.top - navRect.top - navRect.height / 2 + linkRect.height / 2;
    }
  }, [activeSlug]);

  // Remember the last-read position (debounced) so the dashboard can resume.
  useEffect(() => {
    if (isGuest || !activeSlug) return;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      fetch("/api/notes/reading", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeSlug, title: activeTitle }),
      }).catch(() => {});
    }, 1500);
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [activeSlug, activeTitle, isGuest]);

  const toggleRead = useCallback(
    (slug: string) => {
      if (isGuest) {
        promptSignup("reading progress");
        return;
      }
      const willRead = !readSlugs.has(slug);
      setReadSlugs((prev) => {
        const next = new Set(prev);
        if (willRead) next.add(slug);
        else next.delete(slug);
        return next;
      });
      fetch("/api/notes/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, read: willRead }),
      }).catch(() => {});
    },
    [isGuest, promptSignup, readSlugs]
  );

  const openQuiz = (topic: string) => {
    if (isGuest) {
      promptSignup("AI quizzes");
      return;
    }
    setQuizTopic(topic);
    setQuizOpen(true);
    setMobileOpen(false);
  };

  const doneCount = readSlugs.size;

  const list = (
    <nav
      ref={navRef}
      className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5"
    >
      {filtered.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          No topics match &ldquo;{query}&rdquo;
        </p>
      )}
      {filtered.map((item) => {
        const isActive = item.slug === activeSlug;
        const isRead = readSlugs.has(item.slug);
        return (
          <div
            key={item.slug}
            className={`group flex items-center gap-1.5 rounded-lg border-l-2 transition-colors ${
              isActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-transparent hover:bg-muted"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleRead(item.slug)}
              title={isRead ? "Mark as unread" : "Mark as read"}
              className={`ml-2 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition ${
                isRead
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-border hover:border-indigo-500"
              }`}
            >
              {isRead && <Check className="w-3 h-3" />}
            </button>
            <a
              href={`#${item.slug}`}
              data-slug={item.slug}
              onClick={() => {
                setActiveSlug(item.slug);
                setMobileOpen(false);
              }}
              className={`block flex-1 min-w-0 pr-2 py-1.5 text-sm truncate transition-colors ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                  : isRead
                  ? "text-muted-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={item.title}
            >
              {item.title}
            </a>
          </div>
        );
      })}
    </nav>
  );

  const header = (
    <div className="px-4 pt-4 pb-3 border-b border-border/60">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <ListTree className="w-3.5 h-3.5" />
          On this page
        </div>
        <div className="flex items-center gap-1.5" title={`${doneCount}/${toc.length} topics read`}>
          <RingProgress done={doneCount} total={toc.length} />
          <span className="text-[11px] font-bold text-foreground">
            {doneCount}/{toc.length}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => openQuiz(activeTitle)}
        className="w-full mb-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
      >
        <Sparkles className="w-3.5 h-3.5" /> Test me on {activeTitle.slice(0, 22)}
        {activeTitle.length > 22 ? "…" : ""}
      </button>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics"
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-muted/60 border border-transparent focus:border-indigo-500/50 focus:bg-background outline-none transition-colors"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 self-start sticky top-6">
        <div className="max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
          {header}
          {list}
          <div className="px-4 py-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
            {doneCount === toc.length && toc.length > 0
              ? "All topics read 🎉"
              : `${toc.length} topics`}
          </div>
        </div>
      </aside>

      {/* Mobile floating "On this page" button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 text-sm font-bold"
      >
        <ListTree className="w-4 h-4" />
        On this page
        <span className="text-[11px] font-semibold opacity-90">
          {doneCount}/{toc.length}
        </span>
      </button>

      {/* Mobile bottom-sheet drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={() => setMobileOpen(false)}
        >
          <div
            className="w-full bg-card border-t border-border rounded-t-2xl max-h-[78vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 absolute left-1/2 -translate-x-1/2" />
              <span className="text-sm font-bold text-foreground">Contents</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {header}
            {list}
          </div>
        </div>
      )}

      <QuizModal
        open={quizOpen}
        topic={quizTopic}
        onClose={() => setQuizOpen(false)}
      />
    </>
  );
}
