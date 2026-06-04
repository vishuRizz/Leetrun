"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { Sparkles, X, LogIn, Rocket, ArrowRight } from "lucide-react";
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Rocket className="w-6 h-6 text-indigo-500" />
          </div>

          <h2 className="text-xl font-bold tracking-tight leading-snug">
            {feature ? `Sign up to unlock ${feature}` : "Sign up to continue"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Create a free account to save your progress.
          </p>

          <div className="mt-6 space-y-2.5">
            <Link
              href="/signup"
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-3 rounded-xl transition shadow-sm"
            >
              Sign up free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 border border-border hover:bg-muted text-foreground font-semibold px-4 py-2.5 rounded-xl transition text-sm"
            >
              <LogIn className="w-4 h-4" /> I already have an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
