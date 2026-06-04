"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Shuffle,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  FLASHCARDS,
  FLASHCARD_CATEGORIES,
  type Flashcard,
  type FlashcardCategory,
} from "@/lib/flashcards";

const STORE_KEY = "leetrun.flashcards.known.v1";

const CAT_COLOR: Record<FlashcardCategory, string> = {
  "Pattern Triggers": "from-indigo-500 to-violet-500",
  Complexity: "from-sky-500 to-cyan-500",
  "Data Structures": "from-emerald-500 to-teal-500",
  Pitfalls: "from-rose-500 to-orange-500",
};

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const [filter, setFilter] = useState<FlashcardCategory | "All">("All");
  const [order, setOrder] = useState<Flashcard[]>(FLASHCARDS);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setKnown(new Set(JSON.parse(raw)));
    } catch {
      /* noop */
    }
  }, []);

  const persist = (s: Set<string>) => {
    setKnown(new Set(s));
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(s)));
    } catch {
      /* noop */
    }
  };

  const deck = useMemo(
    () =>
      filter === "All"
        ? order
        : order.filter((c) => c.category === filter),
    [order, filter]
  );

  // Keep the index in range when the filter changes.
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [filter]);

  const card = deck[index];
  const knownInDeck = deck.filter((c) => known.has(c.id)).length;

  const go = (delta: number) => {
    if (deck.length === 0) return;
    setFlipped(false);
    setIndex((i) => (i + delta + deck.length) % deck.length);
  };

  const toggleKnown = () => {
    if (!card) return;
    const next = new Set(known);
    if (next.has(card.id)) next.delete(card.id);
    else next.add(card.id);
    persist(next);
  };

  const reshuffle = () => {
    setOrder(shuffleArr(FLASHCARDS));
    setIndex(0);
    setFlipped(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-500" />
          <h1 className="font-extrabold text-xl">Flashcards</h1>
        </div>
        <button
          type="button"
          onClick={reshuffle}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition"
        >
          <Shuffle className="w-3.5 h-3.5" /> Shuffle
        </button>
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(["All", ...FLASHCARD_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                filter === c
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {card ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
              <span>
                Card {index + 1} of {deck.length}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {knownInDeck} known
              </span>
            </div>

            {/* Flip card */}
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="group relative w-full min-h-[260px] [perspective:1600px] text-left"
            >
              <div
                className="relative w-full min-h-[260px] transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
              >
                {/* Front */}
                <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl border border-border bg-card shadow-sm p-7 flex flex-col">
                  <span
                    className={`self-start text-[10px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${CAT_COLOR[card.category]}`}
                  >
                    {card.category}
                  </span>
                  <div className="flex-1 flex items-center">
                    <p className="text-lg font-bold leading-snug">{card.front}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Tap to reveal →
                  </span>
                </div>
                {/* Back */}
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 shadow-sm p-7 flex flex-col">
                  <span className="self-start text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Answer
                  </span>
                  <div className="flex-1 flex items-center">
                    <p className="text-base font-medium leading-relaxed text-foreground">
                      {card.back}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    ← Tap to flip back
                  </span>
                </div>
              </div>
            </button>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 mt-5">
              <button
                type="button"
                onClick={() => go(-1)}
                className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                type="button"
                onClick={toggleKnown}
                className={`inline-flex items-center gap-1.5 text-sm font-bold rounded-lg px-5 py-2 transition ${
                  known.has(card.id)
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                <Check className="w-4 h-4" />
                {known.has(card.id) ? "Known" : "Mark known"}
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground border border-border rounded-lg px-4 py-2 transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {known.size > 0 && (
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => persist(new Set())}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-rose-500 transition"
                >
                  <RotateCcw className="w-3 h-3" /> Reset progress
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center text-muted-foreground text-sm">
            No cards in this category.
          </div>
        )}
      </main>
    </div>
  );
}
