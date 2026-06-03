import type { Metadata } from "next";
import { Network } from "lucide-react";
import { getPatternFamilies, getPatternsTotalQuestions } from "@/lib/patterns";
import PatternsBrowser from "./PatternsBrowser";

export const metadata: Metadata = {
  title: "DSA Patterns",
  description:
    "The top coding patterns asked in technical interviews, ranked by weightage, with curated pattern-wise practice questions.",
};

export default function PatternsPage() {
  const families = getPatternFamilies();
  const total = getPatternsTotalQuestions();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Network className="w-5 h-5 text-indigo-500" />
        <h1 className="font-extrabold text-xl text-foreground">Patterns</h1>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-black text-foreground">
            Top interview patterns by weightage
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Master the recurring problem-solving patterns interviewers love most.
            Patterns are ranked by how often they show up across our curated
            question bank — expand any pattern to drill into the exact problems.
          </p>
        </div>

        <PatternsBrowser families={families} total={total} />
      </main>
    </div>
  );
}
