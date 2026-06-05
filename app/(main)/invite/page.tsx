"use client";

import React, { useEffect, useState } from "react";
import {
  Gift,
  Copy,
  Check,
  Coins,
  Users,
  Share2,
  Loader2,
} from "lucide-react";

interface ReferralData {
  code: string;
  link: string;
  rewardCoins: number;
  count: number;
  coinsEarned: number;
  referrals: {
    name: string;
    username: string | null;
    avatarUrl: string | null;
    joinedAt: string;
  }[];
}

export default function InvitePage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/referrals");
        if (res.ok) setData(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (!data) return;
    const shareData = {
      title: "Join me on LeetRun",
      text: `Crack placements with me on LeetRun — we both get ${data.rewardCoins} coins when you join!`,
      url: data.link,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const reward = data?.rewardCoins ?? 50;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <Gift className="w-5 h-5 text-indigo-500" />
          <h1 className="font-black text-lg">Invite &amp; Earn</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-indigo-500/10 via-card to-violet-500/10 p-6 sm:p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/15 flex items-center justify-center mb-4">
            <Gift className="w-7 h-7 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-black">
            Give {reward} coins, get {reward} coins
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Share your link. When a friend joins and finishes onboarding, you
            <strong className="text-foreground"> both </strong> earn {reward}{" "}
            coins.
          </p>

          {/* Link + copy */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
            <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2.5 min-w-0">
              <span className="text-sm font-mono truncate text-foreground">
                {data?.link}
              </span>
            </div>
            <button
              onClick={copy}
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold px-4 py-2.5 rounded-lg transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy
                </>
              )}
            </button>
            <button
              onClick={share}
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/70 border border-border text-sm font-bold px-4 py-2.5 rounded-lg transition"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Your code: <span className="font-mono font-bold">{data?.code}</span>
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="text-2xl font-black">{data?.count ?? 0}</div>
              <div className="text-xs text-muted-foreground">Friends joined</div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-black">{data?.coinsEarned ?? 0}</div>
              <div className="text-xs text-muted-foreground">Coins earned</div>
            </div>
          </div>
        </section>

        {/* Referred friends */}
        {data && data.referrals.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Your referrals
            </h3>
            <div className="space-y-3">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-sm overflow-hidden">
                    {r.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.avatarUrl}
                        alt={r.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      r.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    {r.username && (
                      <div className="text-xs text-muted-foreground truncate">
                        @{r.username}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> +{reward}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-bold text-sm mb-4">How it works</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {[
              "Share your unique link with friends preparing for placements.",
              "They sign up and connect their LeetCode account.",
              `Once they finish onboarding, you both instantly get ${reward} coins.`,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
