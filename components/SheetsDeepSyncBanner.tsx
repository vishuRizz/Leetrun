"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Cookie, ChevronRight } from "lucide-react";
import DeepLeetcodeSyncModal from "@/components/DeepLeetcodeSyncModal";

interface Props {
  /** Called after a successful deep sync (e.g. refresh page data). */
  onSynced?: () => void;
}

export default function SheetsDeepSyncBanner({ onSynced }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{
    hasLeetcode: boolean;
    username: string | null;
    deepSyncedAt: string | null;
    deepSyncCount: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/leetcode/deep-sync")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStatus(d);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-black text-sm text-foreground">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            Auto-track from LeetCode
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xl">
            Already solved problems on LeetCode? Run a{" "}
            <span className="font-bold text-foreground">Deep Sync</span> with
            your session cookie and we&apos;ll automatically check off matching
            problems across all Striver sheets.
          </p>
          {status?.deepSyncedAt && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              Last synced: {status.deepSyncCount} LeetCode solves imported
            </p>
          )}
          {!status?.hasLeetcode && status !== null && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
              Connect your LeetCode username on Profile first.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition"
        >
          <Cookie className="w-3.5 h-3.5" />
          Deep Sync
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <DeepLeetcodeSyncModal
        open={open}
        onClose={() => setOpen(false)}
        emphasizeSheets
        leetcodeUsername={status?.username}
        onSuccess={() => {
          onSynced?.();
          if (!onSynced) window.location.reload();
          fetch("/api/leetcode/deep-sync")
            .then((r) => r.json())
            .then((d) => {
              if (d.success) setStatus(d);
            })
            .catch(() => {});
        }}
      />
    </>
  );
}
