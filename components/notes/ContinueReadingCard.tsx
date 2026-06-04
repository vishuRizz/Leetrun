"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

/**
 * Surfaces a "continue reading" resume button on the dashboard pointing at the
 * last System Design topic the user scrolled to. Renders nothing if there's no
 * saved position (or the user is a guest / request fails).
 */
export default function ContinueReadingCard() {
  const [last, setLast] = useState<{ slug: string; title: string | null } | null>(
    null
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/notes/reading");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data?.last?.slug) setLast(data.last);
      } catch {
        /* noop */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!last) return null;

  return (
    <Link
      href={`/notes#${last.slug}`}
      className="group flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-indigo-500/40 transition shadow-sm"
    >
      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
        <BookOpen className="w-5 h-5 text-indigo-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Continue reading
        </div>
        <div className="text-sm font-bold text-foreground truncate">
          {last.title || "System Design"}
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
        Resume
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}
