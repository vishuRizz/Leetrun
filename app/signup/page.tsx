"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, ShieldAlert, ArrowRight, Loader2, Globe } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setMessage("A verification code was sent to your email!");
      } else {
        setError(data.error || "Signup failed. Try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/verify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        // Authenticate the user directly using signInWithPassword since they just set their password!
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });

        if (loginRes.ok) {
          router.push("/onboarding");
        } else {
          router.push("/login?message=Registration%20verified!%20Please%20log%20in.");
        }
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      setError("Verification failed.");
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
            CREATE ACCOUNT
          </h1>
          <p className="text-muted-foreground text-xs mt-1">Start your gamified DSA preparation</p>
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

        {!otpSent ? (
          /* Email / Password registration form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
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
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                Create Password (min 6 chars)
              </label>
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
              disabled={loading || !email || password.length < 6}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating profile...
                </>
              ) : (
                <>
                  Sign Up <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Signup Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                Confirm OTP Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg py-2.5 px-4 text-center font-bold text-xl tracking-widest text-white placeholder-slate-800 outline-none transition"
                placeholder="000000"
                required
              />
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Enter the verification code sent to <strong className="text-muted-foreground">{email}</strong> to activate your profile.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setError("");
                setMessage("");
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-white transition font-medium pt-2"
            >
              Change registration details
            </button>
          </form>
        )}

        {/* Redirect to login */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition">
            Log In
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

        {/* Google OAuth trigger */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-slate-700 text-slate-200 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2"
        >
          <Globe className="w-4 h-4 text-indigo-400" /> Google Signup
        </button>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-slate-400 text-sm font-medium">Loading...</p>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
