import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { siteConfig } from "@/lib/site";

interface Props {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for the public legal pages (Privacy, Terms). Renders outside
 * the app sidebar with a simple branded header and a readable prose column.
 */
export default function LegalShell({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo width={26} height={26} />
            <span className="font-black tracking-wider">{siteConfig.name}</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground/90 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline">
          {children}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <a
            href={`mailto:${siteConfig.email}`}
            className="hover:text-foreground transition-colors"
          >
            {siteConfig.email}
          </a>
        </div>
      </main>
    </div>
  );
}
