"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { Sparkles, X, LogIn, Rocket, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface GuestContextValue {
  isGuest: boolean;
  loadingAuth: boolean;
  promptSignup: (feature?: string) => void;
}

const GuestContext = createContext<GuestContextValue>({
  isGuest: false,
  loadingAuth: true,
  promptSignup: () => {},
});

export function useGuest() {
  return useContext(GuestContext);
}

export default function GuestProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isGuest, setIsGuest] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [feature, setFeature] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (active) setIsGuest(!user);
      } catch {
        /* treat as guest on failure */
        if (active) setIsGuest(true);
      } finally {
        if (active) setLoadingAuth(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const promptSignup = useCallback((f?: string) => {
    setFeature(f ?? null);
    setModalOpen(true);
  }, []);

  return (
    <GuestContext.Provider value={{ isGuest, loadingAuth, promptSignup }}>
      {isGuest && !loadingAuth && <GuestBanner onSignup={() => promptSignup()} />}
      {children}
      {modalOpen && (
        <SignupModal feature={feature} onClose={() => setModalOpen(false)} />
      )}
    </GuestContext.Provider>
  );
}

function GuestBanner({ onSignup }: { onSignup: () => void }) {
  return (
    <div className="relative z-[55] flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white text-sm">
      <Sparkles className="w-4 h-4 shrink-0" />
      <p className="min-w-0 flex-1 font-medium truncate">
        You&apos;re exploring LeetRun as a{" "}
        <span className="font-black">guest</span> — sign up to track your real
        progress.
      </p>
      <button
        type="button"
        onClick={onSignup}
        className="shrink-0 inline-flex items-center gap-1.5 bg-white text-indigo-700 hover:bg-white/90 font-bold text-xs px-3 py-1.5 rounded-lg transition"
      >
        <Rocket className="w-3.5 h-3.5" /> Sign up free
      </button>
      <Link
        href="/login"
        className="shrink-0 hidden sm:inline-flex items-center gap-1.5 border border-white/40 hover:bg-white/10 font-bold text-xs px-3 py-1.5 rounded-lg transition"
      >
        <LogIn className="w-3.5 h-3.5" /> Log in
      </Link>
    </div>
  );
}

function SignupModal({
  feature,
  onClose,
}: {
  feature: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 pt-10 pb-8 text-center text-white">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black">
            {feature ? `Unlock ${feature}` : "Create your free account"}
          </h2>
          <p className="text-sm text-white/85 mt-2 leading-relaxed">
            {feature
              ? `Sign up to ${feature.toLowerCase()} and save your progress.`
              : "This is a live preview. Sign up to make it yours."}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <ul className="space-y-2.5">
            {[
              "Sync your real LeetCode stats & solve history",
              "Personalized daily, weekly & revision quests",
              "Track curated sheets and climb the leaderboards",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-sm text-foreground"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                {line}
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold px-4 py-3 rounded-xl transition shadow-sm"
          >
            <Rocket className="w-4 h-4" /> Get started free
          </Link>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground font-bold px-4 py-3 rounded-xl transition"
          >
            <LogIn className="w-4 h-4" /> I already have an account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition pt-1"
          >
            Keep exploring as guest
          </button>
        </div>
      </div>
    </div>
  );
}
