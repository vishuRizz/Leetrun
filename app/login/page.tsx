"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Mail, Lock, ShieldAlert, ArrowRight, Loader2, Globe } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const redirectMessage = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(oauthError || "");
  const [message, setMessage] = useState(redirectMessage || "");

  const supabase = createClient();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        // Fetch session to determine redirection path (dashboard vs onboarding)
        const nextPath = data.user?.user_metadata?.onboardingDone ? "/dashboard" : "/onboarding";
        router.push(nextPath);
      } else {
        setError(data.error || "Invalid email or password. Please verify credentials.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
    } catch (err) {
      setError("Failed to initialize Google login.");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 transition-colors">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md relative z-10">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            CODERUN
          </h1>
          <p className="text-muted-foreground text-xs mt-1 font-semibold uppercase tracking-widest">Sign In</p>
        </div>

        {/* Message and Error alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/40 text-red-200 text-sm rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-200 text-sm rounded-lg">
            {message}
          </div>
        )}

        {/* Email & Password login form */}
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border-border focus:border-primary rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder-slate-600 outline-none transition"
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 font-medium transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border-border focus:border-primary rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder-slate-600 outline-none transition"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-foreground rounded-lg font-bold text-sm transition flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Logging in...
              </>
            ) : (
              <>
                Log In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Redirect to signup */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:text-primary/80 font-bold transition">
            Sign Up
          </Link>
        </p>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-700 text-slate-200 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2"
        >
          <Globe className="w-4 h-4 text-indigo-400" /> Sign in with Google
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-muted-foreground text-sm font-medium">Loading session helper...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
