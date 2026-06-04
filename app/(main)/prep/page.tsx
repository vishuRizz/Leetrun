"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap, CalendarClock, Brain } from "lucide-react";
import StudyPlanView from "@/components/prep/StudyPlanView";
import FlashcardsView from "@/components/prep/FlashcardsView";

type Tab = "plan" | "cards";

function PrepKit() {
  const params = useSearchParams();
  const initial: Tab = params.get("tab") === "cards" ? "cards" : "plan";
  const [tab, setTab] = useState<Tab>(initial);

  const tabs: { id: Tab; label: string; icon: typeof CalendarClock }[] = [
    { id: "plan", label: "Study Plan", icon: CalendarClock },
    { id: "cards", label: "Flashcards", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 sticky top-0 z-40">
        <div className="flex items-center gap-2 shrink-0">
          <GraduationCap className="w-5 h-5 text-indigo-500" />
          <h1 className="font-extrabold text-xl">Prep Kit</h1>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1 w-fit">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "plan" ? <StudyPlanView /> : <FlashcardsView />}
    </div>
  );
}

export default function PrepPage() {
  return (
    <Suspense fallback={null}>
      <PrepKit />
    </Suspense>
  );
}
