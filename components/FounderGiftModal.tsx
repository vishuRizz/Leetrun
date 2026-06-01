"use client";

import React, { useEffect, useState } from "react";
import { Crown, Gift, Sparkles, Check } from "lucide-react";

/**
 * Renders a one-time celebratory modal that grants every eligible user
 * a free lifetime PRO subscription as a gift from the founder.
 *
 * Behaviour:
 *  - On mount, asks `/api/founder-gift/status` whether to show the modal.
 *  - Eligible users see the modal; clicking "Accept your gift" POSTs to
 *    `/api/founder-gift/claim` which is idempotent.
 *  - Once granted, the API event marker prevents the modal from ever
 *    appearing again for that user.
 *  - There is no dismiss button — accepting the gift is the only path
 *    forward, by design.
 */
export function FounderGiftModal() {
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/founder-gift/status", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "eligible") setVisible(true);
      } catch {
        /* silent — modal simply won't appear */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/founder-gift/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't claim the gift. Try again.");
        return;
      }
      setClaimed(true);
      // Invalidate client-side caches so the upgraded PRO state appears immediately.
      try {
        sessionStorage.removeItem("dashboard:v2");
        sessionStorage.removeItem("analytics:v1");
      } catch {
        /* ignore quota / privacy */
      }
      // Brief celebration before the modal closes.
      setTimeout(() => {
        setVisible(false);
        // Hard-refresh so server components reflect the new PRO plan immediately.
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md bg-card border border-yellow-500/30 rounded-3xl shadow-2xl shadow-yellow-500/10 overflow-hidden">
        {/* Gradient header */}
        <div className="relative h-32 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            {/* Decorative sparkles */}
            <Sparkles className="absolute top-4 left-6 w-5 h-5 text-white" />
            <Sparkles className="absolute top-10 right-8 w-4 h-4 text-white" />
            <Sparkles className="absolute bottom-6 left-12 w-3.5 h-3.5 text-white" />
            <Sparkles className="absolute bottom-3 right-14 w-5 h-5 text-white" />
          </div>
          <div className="relative bg-white/20 backdrop-blur-md border border-white/40 rounded-full p-4">
            <Gift className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-[10px] uppercase tracking-widest font-black text-yellow-600 dark:text-yellow-400">
              A gift from the founder
            </span>
          </div>

          <h2 className="font-heading text-2xl font-black text-foreground">
            You just got LeetRun PRO — for free, for life.
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Hey, I&apos;m <span className="font-bold text-foreground">Vishu</span>,
            the founder of LeetRun. As a thank-you for being one of the
            earliest users, I&apos;m gifting you a lifetime PRO subscription
            on the house. No card, no catch. Just go ship those interviews.
          </p>

          <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/30 dark:via-amber-950/30 dark:to-orange-950/30 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-3 space-y-1.5">
            <PerkRow text="Premium AI mentor &amp; deep code reviews" />
            <PerkRow text="Advanced analytics &amp; topic intelligence" />
            <PerkRow text="Priority lobby slots &amp; quests" />
          </div>

          {error && (
            <div className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleClaim}
            disabled={claiming || claimed}
            className="w-full py-3 rounded-xl font-black text-sm tracking-wide transition shadow-lg shadow-yellow-500/20 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:via-amber-400 hover:to-orange-400 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {claimed ? (
              <>
                <Check className="w-4 h-4" /> You&apos;re officially PRO 🎉
              </>
            ) : claiming ? (
              "Activating PRO…"
            ) : (
              <>
                <Crown className="w-4 h-4" /> Accept your gift
              </>
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center font-mono">
            One-tap, irrevocable, and absolutely free. — Vishu
          </p>
        </div>
      </div>
    </div>
  );
}

function PerkRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground">
      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}
