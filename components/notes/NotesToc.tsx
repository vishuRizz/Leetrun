"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, ListTree } from "lucide-react";
import type { NotesTocItem } from "@/lib/notes/system-design";

export default function NotesToc({ toc }: { toc: NotesTocItem[] }) {
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(
    toc[0]?.slug ?? null
  );
  const navRef = useRef<HTMLElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return toc;
    return toc.filter((t) => t.title.toLowerCase().includes(q));
  }, [query, toc]);

  // Scroll-spy: highlight the topic currently in view. We track the topmost
  // heading that has crossed the upper third of the viewport.
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
        if (visible[0]?.target?.id) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  // Keep the active item visible within the (independently scrolling) nav.
  useEffect(() => {
    if (!activeSlug || !navRef.current) return;
    const link = navRef.current.querySelector<HTMLElement>(
      `[data-slug="${activeSlug}"]`
    );
    link?.scrollIntoView({ block: "nearest" });
  }, [activeSlug]);

  return (
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            <ListTree className="w-3.5 h-3.5" />
            On this page
          </div>
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
            return (
              <a
                key={item.slug}
                href={`#${item.slug}`}
                data-slug={item.slug}
                onClick={() => setActiveSlug(item.slug)}
                className={`block pl-3 pr-2 py-1.5 text-sm rounded-lg border-l-2 transition-colors truncate ${
                  isActive
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={item.title}
              >
                {item.title}
              </a>
            );
          })}
        </nav>

        <div className="px-4 py-2.5 border-t border-border/60 text-[11px] text-muted-foreground">
          {toc.length} topics
        </div>
      </div>
    </aside>
  );
}
