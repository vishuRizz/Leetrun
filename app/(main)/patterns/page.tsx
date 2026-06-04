import type { Metadata } from "next";
import { Network } from "lucide-react";
import { getPatternFamilies, getPatternsTotalQuestions } from "@/lib/patterns";
import { getPatternTemplates } from "@/lib/patterns/templates";
import PatternsView from "./PatternsView";

export const metadata: Metadata = {
  title: "DSA Patterns",
  description:
    "The top coding patterns asked in technical interviews, ranked by weightage, with curated pattern-wise practice questions and ready-to-use C++ templates.",
};

export default function PatternsPage() {
  const families = getPatternFamilies();
  const total = getPatternsTotalQuestions();
  const templates = getPatternTemplates();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Network className="w-5 h-5 text-indigo-500" />
        <h1 className="font-extrabold text-xl text-foreground">Patterns</h1>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-black text-foreground">
            Master the patterns interviewers love
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            See the recurring problem-solving patterns ranked by weightage, or
            switch to Templates for ready-to-use C++ snippets you can revise and
            copy before an interview.
          </p>
        </div>

        <PatternsView families={families} total={total} templates={templates} />
      </main>
    </div>
  );
}
