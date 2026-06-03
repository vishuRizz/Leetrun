"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Mail,
  Send,
  Search,
  Users,
  Check,
  Flame,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  DEFAULT_REENGAGE_SUBJECT,
  DEFAULT_REENGAGE_MESSAGE,
} from "@/lib/email/templates/reengage";

interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  totalXp: number;
  currentStreak: number;
  plan: string;
  createdAt: string;
  lastSyncedAt: string | null;
}

export default function AdminClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState(DEFAULT_REENGAGE_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_REENGAGE_MESSAGE);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) return;
        const json = await res.json();
        setUsers(json.users || []);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((u) => selected.has(u.email));

  const toggle = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((u) => next.delete(u.email));
      } else {
        filtered.forEach((u) => next.add(u.email));
      }
      return next;
    });
  };

  const handleSend = async () => {
    setResult(null);
    const emails = Array.from(selected);
    if (emails.length === 0) {
      setResult({ type: "error", text: "Select at least one recipient." });
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setResult({ type: "error", text: "Subject and message are required." });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, subject, message }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ type: "error", text: json.error || "Failed to send." });
        return;
      }
      setResult({
        type: "success",
        text: `Sent ${json.sent} email${json.sent === 1 ? "" : "s"}${
          json.failed ? `, ${json.failed} failed` : ""
        }.`,
      });
    } catch {
      setResult({ type: "error", text: "Network error. Try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center gap-2 sticky top-0 z-40">
        <Shield className="w-5 h-5 text-pink-500" />
        <h1 className="font-extrabold text-xl text-foreground">Admin</h1>
        <span className="ml-2 text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">
          Restricted
        </span>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Users list */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500" />
            <h2 className="font-black text-sm text-foreground">All Users</h2>
            <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {loading ? "…" : users.length}
            </span>
            <span className="ml-auto text-[11px] font-bold text-pink-600 dark:text-pink-400">
              {selected.size} selected
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, username…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pink-500/60"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted/40">
              <button
                type="button"
                onClick={toggleAllFiltered}
                disabled={filtered.length === 0}
                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition ${
                  allFilteredSelected
                    ? "bg-pink-500 border-pink-500 text-white"
                    : "bg-background border-border hover:border-pink-500"
                }`}
                title="Select all"
              >
                {allFilteredSelected && <Check className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Select all {search ? "(filtered)" : ""}
              </span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
              {loading && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading users…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No users found.
                </div>
              )}
              {filtered.map((u) => {
                const isSel = selected.has(u.email);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.email)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition ${
                      isSel ? "bg-pink-500/5" : ""
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition ${
                        isSel
                          ? "bg-pink-500 border-pink-500 text-white"
                          : "bg-background border-border"
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5" />}
                    </span>
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-black text-muted-foreground shrink-0">
                        {(u.fullName || u.email)[0]?.toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate">
                        {u.fullName || u.email.split("@")[0]}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {u.email}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-orange-500">
                        <Flame className="w-3 h-3" /> {u.currentStreak}
                      </span>
                      <span className="inline-flex items-center gap-1 text-indigo-500">
                        <Sparkles className="w-3 h-3" /> {u.totalXp}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Compose */}
        <section className="lg:col-span-2">
          <div className="lg:sticky lg:top-24 bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-pink-500" />
              <h2 className="font-black text-sm text-foreground">
                Send re-engagement email
              </h2>
            </div>

            <div className="rounded-xl bg-pink-500/10 border border-pink-500/20 px-3 py-2 text-[11px] text-pink-700 dark:text-pink-300">
              Use <code className="font-mono">{"{{name}}"}</code> to personalize
              with each user&apos;s first name.
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-pink-500/60"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={9}
                className="mt-1.5 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground leading-relaxed focus:outline-none focus:border-pink-500/60 resize-y"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Blank lines start new paragraphs. The email is wrapped in a cute
                pink template with a button to the dashboard.
              </p>
            </div>

            {result && (
              <div
                className={`text-xs font-medium flex items-center gap-1.5 rounded-lg px-3 py-2 ${
                  result.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {result.type === "success" && (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                )}
                {result.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send to {selected.size} user{selected.size === 1 ? "" : "s"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
