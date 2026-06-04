"use client";

import React, { useState } from "react";
import { BarChart3, Code2 } from "lucide-react";
import type { PatternFamily } from "@/lib/patterns";
import type { PatternTemplate } from "@/lib/patterns/templates";
import PatternsBrowser from "./PatternsBrowser";
import TemplatesBrowser from "./TemplatesBrowser";

interface Props {
  families: PatternFamily[];
  total: number;
  templates: PatternTemplate[];
}

type Tab = "weightage" | "templates";

export default function PatternsView({ families, total, templates }: Props) {
  const [tab, setTab] = useState<Tab>("weightage");

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
        <button
          type="button"
          onClick={() => setTab("weightage")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition ${
            tab === "weightage"
              ? "bg-card text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> By Weightage
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition ${
            tab === "templates"
              ? "bg-card text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code2 className="w-4 h-4" /> Templates
        </button>
      </div>

      {tab === "weightage" ? (
        <PatternsBrowser families={families} total={total} />
      ) : (
        <TemplatesBrowser templates={templates} />
      )}
    </div>
  );
}
