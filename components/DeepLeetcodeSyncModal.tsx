"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Loader2,
  Cookie,
  Shield,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export interface DeepSyncStatus {
  hasLeetcode: boolean;
  username: string | null;
  deepSyncedAt: string | null;
  deepSyncCount: number;
  hasSavedCookie: boolean;
}

interface DeepSyncResultPayload {
  solvedCount: number;
  sheetMarked: number;
  deepSyncedAt: string;
  username: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: DeepSyncResultPayload) => void;
  /** When true, emphasize auto sheet progress (sheets page). */
  emphasizeSheets?: boolean;
  leetcodeUsername?: string | null;
}

const STEPS = [
  "Log in to leetcode.com in your browser (same account as your connected username).",
  "Open DevTools - press F12 or right-click → Inspect.",
  "Go to the Application tab → Cookies → https://leetcode.com.",
  "Copy the Value of LEETCODE_SESSION (or copy the full Cookie header from any graphql request in the Network tab).",
  "Paste it below and run Deep Sync.",
];

export default function DeepLeetcodeSyncModal({
  open,
  onClose,
  onSuccess,
  emphasizeSheets = false,
  leetcodeUsername,
}: Props) {
  const [cookie, setCookie] = useState("");
  const [saveCookie, setSaveCookie] = useState(true);
  const [syncSheets, setSyncSheets] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<DeepSyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    setStatusLoading(true);
    fetch("/api/leetcode/deep-sync")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStatus(data);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, [open]);

  if (!open) return null;

  const runSync = async (useSaved = false) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/leetcode/deep-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie: useSaved ? undefined : cookie,
          useSaved,
          saveCookie,
          syncSheets,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deep sync failed.");
        return;
      }
      setSuccess(data.message);
      setCookie("");
      if (data.result) onSuccess?.(data.result);
      // Refresh status
      const st = await fetch("/api/leetcode/deep-sync").then((r) => r.json());
      if (st.success) setStatus(st);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/leetcode/deep-sync", { method: "DELETE" });
      setStatus((s) => (s ? { ...s, hasSavedCookie: false } : s));
      setSuccess("Saved session removed.");
    } catch {
      setError("Could not remove saved session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black text-lg flex items-center gap-2">
              <Cookie className="w-5 h-5 text-indigo-500" />
              Deep LeetCode Sync
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Import every problem you&apos;ve solved on LeetCode
              {leetcodeUsername ? ` (@${leetcodeUsername})` : ""}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {emphasizeSheets && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm">
              <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" />
                Auto-track sheet progress
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Deep sync matches your LeetCode solves to Striver sheets and
                automatically checks off problems you&apos;ve already done - no
                manual ticking required.
              </p>
            </div>
          )}

          {!statusLoading && status && !status.hasLeetcode && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              Connect your LeetCode username on Profile first, then come back
              here to deep sync.
            </div>
          )}

          {status?.deepSyncedAt && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Last deep sync: {status.deepSyncCount} problems ·{" "}
              {new Date(status.deepSyncedAt).toLocaleString()}
            </div>
          )}

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              How to get your cookie
            </div>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
              {STEPS.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <a
              href="https://leetcode.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Open leetcode.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label
              htmlFor="lc-cookie"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2"
            >
              Paste session cookie
            </label>
            <textarea
              id="lc-cookie"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="LEETCODE_SESSION=... or paste the full Cookie header"
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-mono text-foreground outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={syncSheets}
                onChange={(e) => setSyncSheets(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>
                <span className="font-bold text-foreground">
                  Auto-mark matching sheet problems
                </span>
                <span className="block text-muted-foreground mt-0.5">
                  Checks off Striver sheet questions you&apos;ve already solved on
                  LeetCode.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={saveCookie}
                onChange={(e) => setSaveCookie(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Save cookie encrypted
                </span>
                <span className="block text-muted-foreground mt-0.5">
                  Stored encrypted on our server so you can re-sync without
                  pasting again. Never shared or exposed.
                </span>
              </span>
            </label>
          </div>

          {error && (
            <p className="text-xs text-rose-500 font-medium">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {success}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={() => runSync(false)}
              disabled={loading || !cookie.trim() || !status?.hasLeetcode}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl text-sm font-bold transition"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cookie className="w-4 h-4" />
              )}
              Run Deep Sync
            </button>
            {status?.hasSavedCookie && (
              <button
                type="button"
                onClick={() => runSync(true)}
                disabled={loading || !status?.hasLeetcode}
                className="inline-flex items-center justify-center gap-2 border border-border hover:bg-muted disabled:opacity-50 px-4 py-3 rounded-xl text-sm font-bold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Re-sync saved
              </button>
            )}
          </div>

          {status?.hasSavedCookie && (
            <button
              type="button"
              onClick={clearSaved}
              disabled={loading}
              className="text-[11px] text-muted-foreground hover:text-rose-500 transition w-full text-center"
            >
              Remove saved session cookie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
