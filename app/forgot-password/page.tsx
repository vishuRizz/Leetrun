"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";

function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setMessage("A password recovery code has been sent to your email!");
      } else {
        setError(data.error || "Failed to trigger recovery. Ensure the email is registered.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP code.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          password: newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login?message=Password%20reset%20successful!%20Please%20log%20in.");
        }, 2000);
      } else {
        setError(data.error || "Reset failed. Verify the code and try again.");
      }
    } catch (err) {
      setError("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans transition-colors">
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-cyan-500/5 pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8 relative z-10">

        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo width={80} height={80} className="mb-2" />
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mt-1">Reset Password</p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-200 text-sm rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success / message alert */}
        {message && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-200 text-sm rounded-lg">
            {message}
          </div>
        )}

        {!otpSent ? (
          /* Request password reset OTP */
          <form onSubmit={handleSendResetCode} className="space-y-4">
            <div>
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-colors font-sans text-sm"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Code...
                </>
              ) : (
                <>
                  Send Recovery Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Submit Reset Form: OTP and New Password */
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 px-4 text-center font-bold text-xl tracking-widest text-foreground placeholder:text-muted-foreground outline-none transition-colors font-sans"
                placeholder="000000"
                required
              />
            </div>

            <div>
              <label className="block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2">
                New Password (min 6 chars)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-colors font-sans text-sm"
                  placeholder="Enter new password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || newPassword.length < 6}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  Reset Password <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Redirect to login */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-indigo-500 hover:text-indigo-400 font-bold transition">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-muted-foreground text-sm font-medium">Loading...</p>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
