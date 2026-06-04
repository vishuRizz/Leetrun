"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Flame,
  Award,
  CircleDollarSign,
  TrendingUp,
  Target,
  GraduationCap,
  Calendar,
  Bookmark,
  Languages,
  CheckCircle2,
  Sparkles,
  Crown,
  Medal,
  Pencil,
  Camera,
  Check,
  X,
  Trash2,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  Cookie,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import DeepLeetcodeSyncModal from "@/components/DeepLeetcodeSyncModal";
import ContributionCalendar from "@/components/ContributionCalendar";
import GrowthChart from "@/components/GrowthChart";
import ProblemNoteButton from "@/components/ProblemNoteButton";
import AutoLeetcodeSync, {
  LEETCODE_SYNCED_EVENT,
} from "@/components/AutoLeetcodeSync";

interface ProfileData {
  fullName: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  collegeName: string | null;
  targetCompany: string | null;
  createdAt: string;
  level: string;
  totalXp: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  plan: string;
  stats: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    consistencyScore: number;
    strongestTopic: string | null;
    weakestTopic: string | null;
  } | null;
  leetcodeProfile: {
    username: string;
    ranking: number | null;
    reputation: number | null;
    contestRating: number | null;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    acceptanceRate: number | null;
    submissionCalendar: string | null;
    deepSyncedAt: string | null;
    deepSyncCount: number;
    hasSavedCookie: boolean;
    solvedProblemsCount: number;
    languageStats: Array<{
      id: string;
      language: string;
      solved: number;
    }>;
    submissions: Array<{
      id: string;
      title: string;
      slug: string;
      difficulty: string;
      topic: string | null;
      submittedAt: string;
    }>;
  } | null;
  badges: Array<{
    id: string;
    unlockedAt: string;
    badge: {
      title: string;
      description: string;
      icon: string;
      type: string;
    };
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  // Inline name + avatar editor state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameCopied, setUsernameCopied] = useState(false);

  const [lcUsername, setLcUsername] = useState("");
  const [editingLeetcode, setEditingLeetcode] = useState(false);
  const [lcSaving, setLcSaving] = useState(false);
  const [lcError, setLcError] = useState<string | null>(null);
  const [lcSuccess, setLcSuccess] = useState<string | null>(null);
  const [deepSyncOpen, setDeepSyncOpen] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchProfile = async () => {
    try {
      setAuthError(null);
      const res = await fetch("/api/profile", { credentials: "include" });
      const data = await res.json();

      if (res.status === 401) {
        setAuthError("session");
        setProfile(null);
        return;
      }

      if (!res.ok) {
        setAuthError(data.error || "Could not load your profile.");
        setProfile(null);
        return;
      }

      setProfile(data.profile);
      setLcUsername(data.profile.leetcodeProfile?.username || "");
      if (!data.profile.leetcodeProfile) {
        setEditingLeetcode(true);
      }

      // Pull the user's problem notes so the recent-submissions rows can show
      // which problems already have notes.
      try {
        const noteRes = await fetch("/api/notes", { credentials: "include" });
        if (noteRes.ok) {
          const noteData = await noteRes.json();
          if (noteData?.notes) setNotes(noteData.notes);
        }
      } catch {
        /* notes are non-critical */
      }
    } catch (e) {
      console.error(e);
      setAuthError("Network error. Please refresh and try again.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setAuthError("session");
        return;
      }

      await fetchProfile();
    };
    void init();

    // Reload profile data when a background deep sync brings fresh solves.
    const onSynced = () => void fetchProfile();
    window.addEventListener(LEETCODE_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(LEETCODE_SYNCED_EVENT, onSynced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartEditName = () => {
    if (!profile) return;
    setNameDraft(profile.fullName || "");
    setNameError(null);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!profile) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty.");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || "Could not save your name.");
        return;
      }
      setProfile({ ...profile, fullName: data.user.fullName ?? trimmed });
      setEditingName(false);
    } catch (e: any) {
      setNameError(e?.message || "Network error.");
    } finally {
      setSavingName(false);
    }
  };

  const handleStartEditUsername = () => {
    if (!profile) return;
    setUsernameDraft(profile.username || "");
    setUsernameError(null);
    setEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    if (!profile) return;
    const trimmed = usernameDraft.trim().toLowerCase();
    if (!trimmed) {
      setUsernameError("Username can't be empty.");
      return;
    }
    setSavingUsername(true);
    setUsernameError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUsernameError(data.error || "Could not save username.");
        return;
      }
      setProfile({ ...profile, username: data.user.username ?? trimmed });
      setEditingUsername(false);
    } catch (e: any) {
      setUsernameError(e?.message || "Network error.");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleCopyProfileLink = async () => {
    if (!profile?.username) return;
    const url = `${window.location.origin}/${profile.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setUsernameCopied(true);
      setTimeout(() => setUsernameCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }

    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setAvatarError(data.error || "Upload failed.");
        return;
      }
      setProfile({ ...profile, avatarUrl: data.avatarUrl });
    } catch (err: any) {
      setAvatarError(err?.message || "Network error.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatarUrl) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAvatarError(data.error || "Could not remove avatar.");
        return;
      }
      setProfile({ ...profile, avatarUrl: null });
    } catch (err: any) {
      setAvatarError(err?.message || "Network error.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleStartEditLeetcode = () => {
    setLcUsername(profile?.leetcodeProfile?.username || "");
    setLcError(null);
    setLcSuccess(null);
    setEditingLeetcode(true);
  };

  const handleConnectLeetcode = async () => {
    const trimmed = lcUsername.trim().replace(/^@/, "");
    if (!trimmed) {
      setLcError("Enter your LeetCode username.");
      return;
    }
    setLcSaving(true);
    setLcError(null);
    setLcSuccess(null);
    try {
      const res = await fetch("/api/profile/leetcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLcError(data.error || "Could not connect LeetCode account.");
        return;
      }
      setLcSuccess(data.message || "LeetCode connected!");
      setEditingLeetcode(false);
      await fetchProfile();
    } catch (err: any) {
      setLcError(err?.message || "Network error.");
    } finally {
      setLcSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-muted-foreground text-sm">Synchronizing dashboard analytics...</p>
      </div>
    );
  }

  if (!profile) {
    // Guest / unauthenticated: show a friendly "you're a guest" card that
    // invites signup, rather than an error.
    if (authError === "session") {
      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5">
              <span className="text-3xl font-black text-white">?</span>
            </div>
            <h1 className="text-2xl font-black">You&apos;re browsing as Guest</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Your public profile, LeetCode analytics, XP and streaks live here
              once you sign in. Create a free account to claim your profile.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition"
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                className="border border-border hover:bg-muted px-6 py-3 rounded-xl text-sm font-bold transition"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-2 max-w-md">
          {authError || "We couldn't load your profile right now."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition"
          >
            Go to Login
          </Link>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchProfile();
            }}
            className="border border-border hover:bg-muted px-6 py-2.5 rounded-lg text-sm font-bold transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const userStats = profile.stats || {
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    consistencyScore: 0,
    strongestTopic: "N/A",
    weakestTopic: "N/A",
  };

  // Safe variables for percentages
  const easyPct = userStats.totalSolved > 0 ? (userStats.easySolved / userStats.totalSolved) * 100 : 0;
  const mediumPct = userStats.totalSolved > 0 ? (userStats.mediumSolved / userStats.totalSolved) * 100 : 0;
  const hardPct = userStats.totalSolved > 0 ? (userStats.hardSolved / userStats.totalSolved) * 100 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-150">
      <AutoLeetcodeSync />
      {/* Top Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-500" />
          <h1 className="font-extrabold text-xl text-foreground">User Profile</h1>
        </div>
      </nav>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Profile Card Header */}
        <section className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            {/* Avatar + uploader */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <UserAvatar
                  url={profile.avatarUrl}
                  name={profile.fullName}
                  email={profile.email}
                  size={80}
                  rounded="lg"
                  className="shadow-lg shadow-indigo-600/5 text-3xl"
                />
                <button
                  type="button"
                  onClick={handlePickAvatar}
                  disabled={uploadingAvatar}
                  title="Change avatar"
                  className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white p-1.5 rounded-full shadow-md border-2 border-card transition cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
              </div>
              {profile.avatarUrl && !uploadingAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-[10px] text-muted-foreground hover:text-rose-500 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" /> Remove photo
                </button>
              )}
              {avatarError && (
                <p className="text-[10px] text-rose-500 text-center max-w-[120px]">
                  {avatarError}
                </p>
              )}
            </div>

            <div className="text-center md:text-left space-y-1.5">
              {editingName ? (
                <div className="flex flex-col md:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={60}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameError(null);
                      }
                    }}
                    className="bg-background border border-border focus:border-indigo-500 rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground outline-none text-lg font-bold w-56 max-w-full"
                    placeholder="Your name"
                  />
                  <div className="flex gap-1.5 justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      {savingName ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setNameError(null);
                      }}
                      className="bg-muted hover:bg-muted/70 text-muted-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <h2 className="text-2xl font-black text-foreground flex items-center justify-center md:justify-start gap-2">
                  {profile.fullName || profile.email.split("@")[0]}
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    title="Edit name"
                    className="p-1 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-muted transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </h2>
              )}
              {nameError && (
                <p className="text-[11px] text-rose-500">{nameError}</p>
              )}
              <p className="text-muted-foreground text-xs flex items-center justify-center md:justify-start gap-1">
                <Bookmark className="w-3.5 h-3.5" /> {profile.email}
              </p>

              {/* Public profile URL */}
              {editingUsername ? (
                <div className="flex flex-col md:flex-row items-stretch gap-2 pt-1">
                  <div className="flex items-stretch bg-background border border-border focus-within:border-indigo-500 rounded-lg overflow-hidden text-sm">
                    <span className="px-2.5 py-1.5 bg-muted text-muted-foreground font-mono">
                      /
                    </span>
                    <input
                      type="text"
                      value={usernameDraft}
                      onChange={(e) =>
                        setUsernameDraft(
                          e.target.value.toLowerCase().replace(/\s+/g, "")
                        )
                      }
                      maxLength={30}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveUsername();
                        if (e.key === "Escape") {
                          setEditingUsername(false);
                          setUsernameError(null);
                        }
                      }}
                      className="bg-background px-2 py-1.5 text-foreground placeholder:text-muted-foreground outline-none w-44 font-mono"
                      placeholder="your-handle"
                    />
                  </div>
                  <div className="flex gap-1.5 justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={handleSaveUsername}
                      disabled={savingUsername}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      {savingUsername ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUsername(false);
                        setUsernameError(null);
                      }}
                      className="bg-muted hover:bg-muted/70 text-muted-foreground border border-border px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs flex items-center justify-center md:justify-start gap-1.5 pt-1">
                  <span className="font-mono text-indigo-500 dark:text-indigo-400">
                    @{profile.username || "-"}
                  </span>
                  <button
                    type="button"
                    onClick={handleStartEditUsername}
                    title="Edit username"
                    className="p-1 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-muted transition"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {profile.username && (
                    <a
                      href={`/${profile.username}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open public profile"
                      className="p-1 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-muted transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {profile.username && (
                    <button
                      type="button"
                      onClick={handleCopyProfileLink}
                      title="Copy public profile link"
                      className="p-1 rounded-md text-muted-foreground hover:text-indigo-500 hover:bg-muted transition"
                    >
                      {usernameCopied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </p>
              )}
              {usernameError && (
                <p className="text-[11px] text-rose-500">{usernameError}</p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                {profile.collegeName && (
                  <span className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-[10px] font-bold text-foreground border border-border">
                    <GraduationCap className="w-3 h-3 text-indigo-500" /> {profile.collegeName}
                  </span>
                )}
                {profile.targetCompany && (
                  <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                    <Target className="w-3 h-3 text-indigo-500 dark:text-indigo-400 animate-pulse" /> Target: {profile.targetCompany}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  profile.plan === "PREMIUM"
                    ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {profile.plan === "PREMIUM" ? (
                    <span className="flex items-center gap-1.5"><Crown className="w-4 h-4" /> PREMIUM</span>
                  ) : "FREE PLAN"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics stats */}
          <div className="flex gap-4">
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <Flame className="w-5 h-5 text-orange-500 fill-current mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">{profile.currentStreak}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Streak</div>
            </div>
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <Award className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">Lv. {Math.floor(profile.totalXp / 100) + 1}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{profile.totalXp} XP</div>
            </div>
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <CircleDollarSign className="w-5 h-5 text-yellow-500 mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">{profile.coins}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Coins</div>
            </div>
          </div>
        </section>

        {/* LeetCode connect / update */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-500" /> LeetCode Account
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Connect your LeetCode username to sync solves, recalculate XP,
                calibrate your level, and unlock personalized daily quests.
              </p>
            </div>
            {profile.leetcodeProfile && !editingLeetcode && (
              <button
                type="button"
                onClick={handleStartEditLeetcode}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition"
              >
                <Pencil className="w-3.5 h-3.5" /> Update username
              </button>
            )}
          </div>

          {editingLeetcode ? (
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="flex flex-1 items-stretch bg-background border border-border focus-within:border-indigo-500 rounded-lg overflow-hidden">
                <span className="px-3 py-2.5 bg-muted text-muted-foreground text-sm font-mono border-r border-border">
                  @
                </span>
                <input
                  type="text"
                  value={lcUsername}
                  onChange={(e) => setLcUsername(e.target.value.replace(/\s/g, ""))}
                  placeholder="leetcode-username"
                  className="flex-1 bg-background px-3 py-2.5 text-sm text-foreground outline-none font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConnectLeetcode();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConnectLeetcode}
                  disabled={lcSaving || !lcUsername.trim()}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition"
                >
                  {lcSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {profile.leetcodeProfile ? "Sync & update" : "Connect & sync"}
                </button>
                {profile.leetcodeProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeetcode(false);
                      setLcUsername(profile.leetcodeProfile?.username || "");
                      setLcError(null);
                    }}
                    className="px-3 py-2.5 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:bg-muted transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : profile.leetcodeProfile ? (
            <div className="flex flex-wrap items-center gap-4 bg-muted/40 border border-border rounded-xl p-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Connected as
                </div>
                <a
                  href={`https://leetcode.com/u/${profile.leetcodeProfile.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base font-black text-foreground hover:text-indigo-500 transition inline-flex items-center gap-1"
                >
                  @{profile.leetcodeProfile.username}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="text-xs text-muted-foreground">
                Ranking{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  #{profile.leetcodeProfile.ranking ?? "N/A"}
                </span>
                {" · "}
                {profile.leetcodeProfile.totalSolved} solved
              </div>
            </div>
          ) : null}

          {lcError && (
            <p className="text-xs text-rose-500 font-medium">{lcError}</p>
          )}
          {lcSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {lcSuccess}
            </p>
          )}
        </section>

        {/* Deep LeetCode sync */}
        {profile.leetcodeProfile && (
          <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <Cookie className="w-4 h-4 text-indigo-500" /> Deep LeetCode
                  Sync
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Import every problem you&apos;ve solved on LeetCode using your
                  session cookie - full solve history, not just recent
                  submissions. Optionally auto-marks matching Striver sheet
                  progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeepSyncOpen(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                <Cookie className="w-3.5 h-3.5" />
                Deep Sync
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Imported solves
                </div>
                <div className="text-lg font-black text-foreground mt-0.5">
                  {profile.leetcodeProfile.solvedProblemsCount ||
                    profile.leetcodeProfile.deepSyncCount ||
                    0}
                </div>
              </div>
              <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Last deep sync
                </div>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  {profile.leetcodeProfile.deepSyncedAt
                    ? new Date(
                        profile.leetcodeProfile.deepSyncedAt
                      ).toLocaleString()
                    : "Never"}
                </div>
              </div>
              {profile.leetcodeProfile.hasSavedCookie && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-700 dark:text-emerald-400">
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">
                    Saved session
                  </div>
                  <div className="text-sm font-bold mt-0.5">Encrypted on server</div>
                </div>
              )}
            </div>
          </section>
        )}

        <DeepLeetcodeSyncModal
          open={deepSyncOpen}
          onClose={() => setDeepSyncOpen(false)}
          leetcodeUsername={profile.leetcodeProfile?.username}
          onSuccess={() => fetchProfile()}
        />

        {/* Activity contribution calendar (GitHub-style) */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <Calendar className="w-4 h-4 text-indigo-500" /> Activity Calendar
          </h3>
          {profile.leetcodeProfile?.submissionCalendar ? (
            <ContributionCalendar
              calendar={profile.leetcodeProfile.submissionCalendar}
            />
          ) : (
            <p className="text-muted-foreground text-xs py-8 text-center">
              Connect and sync your LeetCode account to see your daily solving
              activity here.
            </p>
          )}
        </section>

        {/* Growth: consistency before vs after joining LeetRun */}
        {profile.leetcodeProfile?.submissionCalendar && (
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Growth on LeetRun
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Joined{" "}
                {new Date(profile.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <GrowthChart
              calendar={profile.leetcodeProfile.submissionCalendar}
              joinDate={profile.createdAt}
            />
          </section>
        )}

        {/* Breakdown section grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Solved stats ring */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Trophy className="w-4 h-4 text-indigo-500" /> Solved Breakdown
            </h3>

            <div className="flex items-center justify-around">
              {/* LeetCode Sync profile status */}
              {profile.leetcodeProfile ? (
                <div className="text-center space-y-1.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">LeetCode Username</div>
                  <div className="text-sm font-bold text-foreground">@{profile.leetcodeProfile.username}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Ranking: <span className="font-bold text-indigo-600 dark:text-indigo-400">#{profile.leetcodeProfile.ranking || "N/A"}</span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs py-4 text-center">No connected LeetCode username synced yet.</div>
              )}
            </div>

            {/* Solved categories */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">Easy Solved</span>
                  <span className="text-foreground">{userStats.easySolved}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${easyPct}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-yellow-600 dark:text-yellow-500">Medium Solved</span>
                  <span className="text-foreground">{userStats.mediumSolved}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <div className="bg-yellow-500 h-full transition-all" style={{ width: `${mediumPct}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-600 dark:text-rose-500">Hard Solved</span>
                  <span className="text-foreground">{userStats.hardSolved}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${hardPct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Overall Rate */}
            {profile.leetcodeProfile?.acceptanceRate && (
              <div className="bg-muted p-4 border border-border rounded-xl flex items-center justify-between text-xs">
                <span className="text-muted-foreground">LeetCode Acceptance Rate</span>
                <span className="font-bold text-foreground">{profile.leetcodeProfile.acceptanceRate.toFixed(1)}%</span>
              </div>
            )}
          </section>

          {/* Languages distribution */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Languages className="w-4 h-4 text-indigo-500" /> Language Distribution
            </h3>

            {!profile.leetcodeProfile?.languageStats || profile.leetcodeProfile.languageStats.length === 0 ? (
              <p className="text-muted-foreground text-xs py-8 text-center">No language stats available.</p>
            ) : (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {profile.leetcodeProfile.languageStats.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{item.language}</span>
                    <span className="font-semibold bg-muted px-2.5 py-1 border border-border rounded text-foreground">
                      {item.solved} solved
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Badges Section */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Earned Badges
            </h3>

            {profile.badges.length === 0 ? (
              <p className="text-muted-foreground text-xs py-10 text-center">
                Keep hitting streaks and challenge rooms to unlock progression badges!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 max-h-64 overflow-y-auto pr-1">
                {profile.badges.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-muted border border-border rounded-xl text-center space-y-1.5 flex flex-col items-center justify-center hover:border-indigo-500/40 transition"
                  >
                    <span className="text-indigo-500">
                      {b.badge.icon ? (
                        <span className="text-2xl">{b.badge.icon}</span>
                      ) : (
                        <Medal className="w-8 h-8" />
                      )}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-[11px] text-foreground leading-tight">{b.badge.title}</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{b.badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Billing Management Section */}
        <section className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-foreground">Account Subscription</h3>
            <p className="text-xs text-muted-foreground">
              {profile.plan === "PREMIUM"
                ? "You have full access to the placement suite, premium AI model logic, and priority mentor advice."
                : "Your account is currently on the Free tier. Upgrade to unlock all premium capabilities."}
            </p>
          </div>
          <div>
            {profile.plan === "PREMIUM" ? (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await fetch("/api/subscription/upgrade", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "cancel" }),
                    });
                    await fetchProfile();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/35 px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel Premium
              </button>
            ) : (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await fetch("/api/subscription/upgrade", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    await fetchProfile();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white px-6 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Upgrade to Premium ($0.20/mo)
              </button>
            )}
          </div>
        </section>

        {/* Recent Submissions List */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Recent Synced Submissions
          </h3>

          {!profile.leetcodeProfile?.submissions || profile.leetcodeProfile.submissions.length === 0 ? (
            <p className="text-muted-foreground text-xs py-8 text-center">No recent submissions synced yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 font-bold uppercase tracking-wider">Problem Name</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Topic</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Difficulty</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-right">Synced At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profile.leetcodeProfile.submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/40 transition">
                      <td className="py-3 font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://leetcode.com/problems/${sub.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {sub.title}
                          </a>
                          <ProblemNoteButton
                            problemRef={sub.slug.toLowerCase()}
                            title={sub.title}
                            initialContent={notes[sub.slug.toLowerCase()] ?? ""}
                          />
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="bg-muted px-2 py-0.5 border border-border rounded text-muted-foreground font-semibold">
                          {sub.topic || "General"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-semibold ${
                            sub.difficulty === "HARD"
                              ? "text-rose-600 dark:text-rose-400"
                              : sub.difficulty === "MEDIUM"
                              ? "text-yellow-600 dark:text-yellow-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {sub.difficulty}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
