"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Flame,
  Award,
  Users,
  Search,
  CheckCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";

interface RankingUser {
  id: string;
  fullName: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  currentStreak: number;
  totalXp: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"global" | "friends">("global");
  const [sortBy, setSortBy] = useState<"xp" | "streak">("xp");
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendEmail, setFriendEmail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [friendMessage, setFriendMessage] = useState("");
  const [friendError, setFriendError] = useState("");

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch("/api/social/friend-request/pending");
      const data = await res.json();
      if (res.ok) {
        setPendingRequests(data.pending || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?filter=${filter}&sortBy=${sortBy}`);
      const data = await res.json();
      if (res.ok) {
        setRankings(data.rankings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToFriendRequest = async (requesterId: string, accept: boolean) => {
    try {
      const res = await fetch("/api/social/friend-request/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId, accept }),
      });
      if (res.ok) {
        await fetchPendingRequests();
        await fetchRankings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRankings();
    if (filter === "friends") {
      fetchPendingRequests();
    }
  }, [filter, sortBy]);

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setSendingRequest(true);
    setFriendMessage("");
    setFriendError("");

    // Create inline request body or API route. Let's send to a new endpoint /api/social/friend-request
    try {
      // Inline POST or standard endpoint
      // We will create the handler in routes or write it inline:
      const res = await fetch("/api/social/friend-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: friendEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendMessage("Friend request sent successfully!");
        setFriendEmail("");
        if (filter === "friends") fetchRankings(); // reload
      } else {
        setFriendError(data.error || "Failed to send request.");
      }
    } catch (err) {
      setFriendError("An unexpected error occurred.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-indigo-500" />
          <h1 className="font-extrabold text-xl text-foreground">Leaderboard</h1>
        </div>
      </nav>

      {/* Grid container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">

        {/* Top Filters Block */}
        <div className="bg-card/40 border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-muted p-1 rounded-xl border border-border w-full sm:w-auto">
            <button
              onClick={() => setFilter("global")}
              className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition ${
                filter === "global" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Global Rank
            </button>
            <button
              onClick={() => setFilter("friends")}
              className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                filter === "friends" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Friends
            </button>
          </div>

          <div className="flex bg-muted p-1 rounded-xl border border-border w-full sm:w-auto">
            <button
              onClick={() => setSortBy("xp")}
              className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition ${
                sortBy === "xp" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sort by XP
            </button>
            <button
              onClick={() => setSortBy("streak")}
              className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                sortBy === "streak" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" /> Sort by Streak
            </button>
          </div>
        </div>

        {/* Add Friend Box (Only visible in Friends tab) */}
        {filter === "friends" && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Send Friend Request</h3>
            <form onSubmit={handleSendFriendRequest} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="Enter friend's registration email..."
                  className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 pl-9 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-colors font-sans text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingRequest || !friendEmail}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-lg font-bold text-xs transition"
              >
                {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Friend"}
              </button>
            </form>
            {friendMessage && (
              <p className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {friendMessage}
              </p>
            )}
            {friendError && (
              <p className="text-red-600 dark:text-red-400 text-xs">{friendError}</p>
            )}
          </div>
        )}

        {/* Pending Friend Requests Inbox */}
        {filter === "friends" && pendingRequests.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Users className="w-4 h-4" /> Pending Friend Requests ({pendingRequests.length})
            </h3>
            <div className="grid gap-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 bg-muted border border-border rounded-xl text-xs"
                >
                  <div>
                    <h4 className="font-bold text-foreground">{req.fullName || req.email.split("@")[0]}</h4>
                    <span className="text-[10px] text-muted-foreground">{req.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondToFriendRequest(req.id, true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespondToFriendRequest(req.id, false)}
                      className="bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-lg font-bold text-xs transition"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Table List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
              Loading rankings...
            </div>
          ) : rankings.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground text-sm">
              No ranks available. Add friends or verify Leetcode sync to trigger leaderboard listings.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rankings.map((user, idx) => {
                const rank = idx + 1;
                const slug = user.username || user.id;
                return (
                  <Link
                    href={`/${slug}`}
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/40 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`w-6 text-center font-bold text-sm ${
                          rank === 1
                            ? "text-yellow-500 font-extrabold text-base"
                            : rank === 2
                            ? "text-slate-400 dark:text-slate-300"
                            : rank === 3
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {rank}
                      </span>

                      <UserAvatar
                        url={user.avatarUrl}
                        name={user.fullName}
                        email={user.email}
                        size={36}
                      />

                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-indigo-500 transition">
                          {user.fullName || user.email.split("@")[0]}
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          {user.username ? `@${user.username} · ` : ""}Level{" "}
                          {Math.floor(user.totalXp / 100) + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      {sortBy === "streak" ? (
                        <div className="flex items-center gap-1.5 text-orange-500 font-bold text-sm">
                          <Flame className="w-4 h-4 fill-current" />
                          <span>{user.currentStreak} days</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="font-bold text-foreground text-sm">{user.totalXp} XP</div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Score</div>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
