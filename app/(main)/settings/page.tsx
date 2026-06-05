"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Bell,
  ShieldAlert,
  Download,
  Loader2,
  Check,
  Mail,
  KeyRound,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SaveState = "idle" | "saving" | "saved" | "error";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

function SaveBadge({ state, error }: { state: SaveState; error?: string }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="w-3.5 h-3.5" /> Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="text-xs text-rose-600 dark:text-rose-400">
        {error || "Something went wrong"}
      </span>
    );
  return null;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-muted border border-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const inputClass =
  "w-full bg-background border border-border focus:border-indigo-500 rounded-lg px-3 py-2 text-sm outline-none transition disabled:opacity-50";

function Section({
  icon: Icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: typeof UserIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        danger
          ? "border-rose-300 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-border">
        <Icon
          className={`w-4 h-4 ${
            danger ? "text-rose-500" : "text-indigo-500"
          }`}
        />
        <div>
          <h2 className="font-bold text-sm text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  // Account
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [accountState, setAccountState] = useState<SaveState>("idle");
  const [accountErr, setAccountErr] = useState("");

  // Email / password
  const [newEmail, setNewEmail] = useState("");
  const [emailState, setEmailState] = useState<SaveState>("idle");
  const [emailMsg, setEmailMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwState, setPwState] = useState<SaveState>("idle");
  const [pwMsg, setPwMsg] = useState("");

  // Preferences
  const [emailReminderEnabled, setEmailReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("");
  const [dailyQuestionTarget, setDailyQuestionTarget] = useState(2);
  const [preferredDifficulty, setPreferredDifficulty] = useState("EASY");
  const [mentorName, setMentorName] = useState("");
  const [prefState, setPrefState] = useState<SaveState>("idle");
  const [prefErr, setPrefErr] = useState("");

  // Danger zone
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.profile;
          setEmail(p.email || "");
          setFullName(p.fullName || "");
          setUsername(p.username || "");
          const prefs = p.preferences;
          if (prefs) {
            setEmailReminderEnabled(prefs.emailReminderEnabled ?? true);
            setReminderTime(prefs.reminderTime || "");
            setDailyQuestionTarget(prefs.dailyQuestionTarget ?? 2);
            setPreferredDifficulty(prefs.preferredDifficulty || "EASY");
            setMentorName(prefs.mentorName || "");
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveAccount = async () => {
    setAccountState("saving");
    setAccountErr("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setAccountState("saved");
      setTimeout(() => setAccountState("idle"), 2500);
    } catch (e: any) {
      setAccountState("error");
      setAccountErr(e.message);
    }
  };

  const savePreferences = async () => {
    setPrefState("saving");
    setPrefErr("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailReminderEnabled,
          reminderTime: reminderTime || null,
          dailyQuestionTarget,
          preferredDifficulty,
          mentorName: mentorName || "Buddy",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setPrefState("saved");
      setTimeout(() => setPrefState("idle"), 2500);
    } catch (e: any) {
      setPrefState("error");
      setPrefErr(e.message);
    }
  };

  const changeEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailState("saving");
    setEmailMsg("");
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailState("error");
      setEmailMsg(error.message);
    } else {
      setEmailState("saved");
      setEmailMsg("Check your new inbox to confirm the change.");
      setNewEmail("");
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      setPwState("error");
      setPwMsg("Password must be at least 8 characters.");
      return;
    }
    setPwState("saving");
    setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwState("error");
      setPwMsg(error.message);
    } else {
      setPwState("saved");
      setPwMsg("Password updated.");
      setNewPassword("");
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leetrun-data-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteErr("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account.");
      }
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      window.location.href = "/";
    } catch (e: any) {
      setDeleteErr(e.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-2.5">
          <SettingsIcon className="w-5 h-5 text-indigo-500" />
          <h1 className="font-black text-lg">Settings</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Account */}
        <Section
          icon={UserIcon}
          title="Account"
          description="Your name and public profile handle."
        >
          <div>
            <label className="text-xs font-bold text-muted-foreground">Full name</label>
            <input
              className={`${inputClass} mt-1`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">Username</label>
            <input
              className={`${inputClass} mt-1`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-handle"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Your public profile lives at /{username || "username"}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveAccount}
              disabled={accountState === "saving"}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              Save changes
            </button>
            <SaveBadge state={accountState} error={accountErr} />
          </div>
        </Section>

        {/* Email & Password */}
        <Section
          icon={Mail}
          title="Email & Password"
          description="Update your sign-in credentials."
        >
          <div>
            <label className="text-xs font-bold text-muted-foreground">
              Current email
            </label>
            <input className={`${inputClass} mt-1`} value={email} disabled />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">New email</label>
            <div className="flex gap-2 mt-1">
              <input
                type="email"
                className={inputClass}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
              />
              <button
                onClick={changeEmail}
                disabled={emailState === "saving" || !newEmail.trim()}
                className="shrink-0 bg-muted hover:bg-muted/70 border border-border text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                Update
              </button>
            </div>
            {emailMsg && (
              <p
                className={`text-xs mt-1.5 ${
                  emailState === "error"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {emailMsg}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> New password
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                onClick={changePassword}
                disabled={pwState === "saving" || !newPassword}
                className="shrink-0 bg-muted hover:bg-muted/70 border border-border text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                Update
              </button>
            </div>
            {pwMsg && (
              <p
                className={`text-xs mt-1.5 ${
                  pwState === "error"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {pwMsg}
              </p>
            )}
          </div>
        </Section>

        {/* Notifications & Practice */}
        <Section
          icon={Bell}
          title="Notifications & Practice"
          description="Reminders, goals, and your AI mentor."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Email reminders</div>
              <div className="text-xs text-muted-foreground">
                Streak and practice nudges.
              </div>
            </div>
            <Toggle
              checked={emailReminderEnabled}
              onChange={setEmailReminderEnabled}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Reminder time
              </label>
              <input
                type="time"
                className={`${inputClass} mt-1`}
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Daily problem goal
              </label>
              <input
                type="number"
                min={1}
                max={20}
                className={`${inputClass} mt-1`}
                value={dailyQuestionTarget}
                onChange={(e) =>
                  setDailyQuestionTarget(Number(e.target.value) || 1)
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                Preferred difficulty
              </label>
              <select
                className={`${inputClass} mt-1`}
                value={preferredDifficulty}
                onChange={(e) => setPreferredDifficulty(e.target.value)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">
                AI mentor name
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                maxLength={30}
                placeholder="Buddy"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={savePreferences}
              disabled={prefState === "saving"}
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              Save preferences
            </button>
            <SaveBadge state={prefState} error={prefErr} />
          </div>
        </Section>

        {/* Data & Privacy */}
        <Section
          icon={Download}
          title="Data & Privacy"
          description="Download a copy of everything we store about you."
        >
          <button
            onClick={exportData}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-muted hover:bg-muted/70 border border-border text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export my data (JSON)
          </button>
        </Section>

        {/* Danger zone */}
        <Section
          icon={ShieldAlert}
          title="Danger Zone"
          description="Permanently delete your account and all associated data. This cannot be undone."
          danger
        >
          <p className="text-sm text-muted-foreground">
            Type <span className="font-mono font-bold text-foreground">DELETE</span>{" "}
            to confirm.
          </p>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <button
              onClick={deleteAccount}
              disabled={confirmText !== "DELETE" || deleting}
              className="shrink-0 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete account
            </button>
          </div>
          {deleteErr && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{deleteErr}</p>
          )}
        </Section>
      </main>
    </div>
  );
}
