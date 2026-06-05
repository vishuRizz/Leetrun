import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import { siteConfig } from "@/lib/site";
import { CHANGELOG, type ChangeTag } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "What's New",
  description: `Latest updates, improvements, and fixes shipped to ${siteConfig.name}.`,
  alternates: { canonical: "/changelog" },
};

const TAG_STYLES: Record<ChangeTag, string> = {
  new: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  improved: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  fixed: "bg-amber-500/15 text-amber-600 dark:text-amber-500",
};

const TAG_LABEL: Record<ChangeTag, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo width={26} height={26} />
            <span className="font-black tracking-wider">{siteConfig.name}</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2.5 mb-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            What&apos;s New
          </h1>
        </div>
        <p className="text-muted-foreground">
          The latest features, improvements, and fixes shipped to {siteConfig.name}.
        </p>

        <div className="mt-10 space-y-10 relative">
          {/* Timeline rail */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border hidden sm:block" />

          {CHANGELOG.map((entry) => (
            <article key={entry.date} className="relative sm:pl-8">
              <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-background hidden sm:block" />
              <time className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {formatDate(entry.date)}
              </time>
              <h2 className="text-xl font-bold mt-1 mb-4">{entry.title}</h2>
              <ul className="space-y-2.5">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full mt-0.5 ${
                        TAG_STYLES[item.tag]
                      }`}
                    >
                      {TAG_LABEL[item.tag]}
                    </span>
                    <span className="text-[15px] leading-relaxed text-foreground/90">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
