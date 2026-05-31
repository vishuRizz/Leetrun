"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
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

interface RankingUser {
  id: string;
  fullName: string | null;
  email: string;
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
      <nav className="border-b border-border/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 text-muted-foreground hover:text-foreground bg-card border border-border hover:border-border rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-indigo-400" />
            <h1 className="font-extrabold text-lg text-foreground">Leaderboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="font-bold text-xs tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            CODERUN LEAGUE
          </span>
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
          <div className="bg-card/30 border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Send Friend Request</h3>
            <form onSubmit={handleSendFriendRequest} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  placeholder="Enter friend's registration email..."
                  className="w-full bg-background border border-border focus:border-primary rounded-lg py-2 pl-9 pr-4 text-xs text-foreground placeholder-muted-foreground outline-none transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sendingRequest || !friendEmail}
                className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 rounded-lg font-bold text-xs transition"
              >
                {sendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Friend"}
              </button>
            </form>
            {friendMessage && (
              <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {friendMessage}</p>
            )}
            {friendError && (
              <p className="text-rose-400 text-xs">{friendError}</p>
            )}
          </div>
        )}

        {/* Pending Friend Requests Inbox */}
        {filter === "friends" && pendingRequests.length > 0 && (
          <div className="bg-card/30 border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-1">
              <Users className="w-4 h-4 text-indigo-400" /> Pending Friend Requests ({pendingRequests.length})
            </h3>
            <div className="grid gap-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 bg-card/60 border border-border rounded-xl text-xs"
                >
                  <div>
                    <h4 className="font-bold text-foreground">{req.fullName || req.email.split("@")[0]}</h4>
                    <span className="text-[10px] text-muted-foreground">{req.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondToFriendRequest(req.id, true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-foreground px-3 py-1.5 rounded-lg font-bold text-xs transition"
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
        <div className="bg-card/20 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
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
            <div className="divide-y divide-slate-850/60">
              {rankings.map((user, idx) => {
                const rank = idx + 1;
                const isTopThree = rank <= 3;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-card/10 transition"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank indicator */}
                      <span
                        className={`w-6 text-center font-bold text-sm ${
                          rank === 1
                            ? "text-yellow-500 font-extrabold text-base"
                            : rank === 2
                            ? "text-slate-300"
                            : rank === 3
                            ? "text-amber-600"
                            : "text-slate-500"
                        }`}
                      >
                        {rank}
                      </span>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-muted border border-slate-700 flex items-center justify-center font-bold text-xs uppercase text-slate-200">
                        {user.fullName ? user.fullName[0] : user.email[0]}
                      </div>

                      {/* Name Details */}
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">
                          {user.fullName || user.email.split("@")[0]}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Level {Math.floor(user.totalXp / 100) + 1}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-right">
                      {sortBy === "streak" ? (
                        <div className="flex items-center gap-1.5 text-orange-500 font-bold text-sm">
                          <Flame className="w-4 h-4 fill-current" />
                          <span>{user.currentStreak} days</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="font-bold text-slate-200 text-sm">{user.totalXp} XP</div>
                          <div className="text-[9px] text-slate-500 uppercase tracking-widest">Score</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
