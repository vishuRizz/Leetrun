"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  Plus,
  Compass,
  LayoutGrid,
  Clipboard,
  AlertCircle,
  ExternalLink,
  Crown,
  Settings,
  Link as LinkIcon,
  CheckCircle2,
  CircleDashed,
  Sparkles,
  Trophy,
  ShieldCheck,
  Trash2,
  RotateCcw,
  X,
  ArrowUpRight,
  ChevronDown,
  UserCircle2,
  MessageSquareText,
  Pencil,
  Video,
  MessagesSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import LobbyChat from "@/components/LobbyChat";
import { useCall } from "@/components/call/CallProvider";

interface Room {
  id: string;
  name: string;
  roomCode: string;
  creatorId: string;
}

interface RoomDetail extends Room {
  members: Array<{
    id: string;
    user: {
      id: string;
      fullName: string | null;
      email: string;
      username: string | null;
      avatarUrl: string | null;
      currentStreak: number;
    };
  }>;
}

interface RoomChallenge {
  id: string;
  deadline: string;
  isHostQuestion?: boolean;
  problemNumber?: number | null;
  comment?: string | null;
  addedBy?: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  challenge: {
    title: string;
    difficulty: string;
    xpReward: number;
    problems: Array<{
      id: string;
      problemName: string;
      problemSlug: string;
      difficulty: string;
      topic: string;
    }>;
  };
  progress: Array<{
    id?: string;
    userId: string;
    completed: boolean;
    claimed?: boolean;
    verified?: boolean;
    markedPreSolved?: boolean;
    xpAwarded?: number;
    user: {
      id?: string;
      fullName: string | null;
      email: string;
    };
  }>;
}

interface LeaderboardEntry {
  userId: string;
  fullName: string | null;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  isHost: boolean;
  xp: number;
  verified: number;
  preSolved: number;
  solved: number;
  rank: number;
  lastActivity: string | null;
}

// useSearchParams (used inside this component for the deep-link
// `?roomId=...` shortcut) requires a Suspense boundary in Next.js 16
// when the route is prerendered. We export a thin Suspense wrapper below.
function RoomsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const call = useCall();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Lists
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);

  // Invite status messages
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");
  const [inviteErrorMsg, setInviteErrorMsg] = useState("");
  
  // Creation/Join state
  const [newRoomName, setNewRoomName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Selected Room Details
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomDetail | null>(null);
  const [roomChallenges, setRoomChallenges] = useState<RoomChallenge[]>([]);

  // Challenge assign parameters
  const [assignTopic, setAssignTopic] = useState("Arrays");
  const [assignDifficulty, setAssignDifficulty] = useState("EASY");
  const [assignCount, setAssignCount] = useState(2);
  const [assignLoading, setAssignLoading] = useState(false);

  // Host-added question form
  const [questionUrl, setQuestionUrl] = useState("");
  const [questionName, setQuestionName] = useState("");
  const [questionNumber, setQuestionNumber] = useState("");
  const [questionDifficulty, setQuestionDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [questionTopic, setQuestionTopic] = useState("Arrays");
  const [questionComment, setQuestionComment] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // Per-question comment popup: which card's comment is open, the in-progress
  // edit state, and a busy flag while saving.
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [hoverCommentId, setHoverCommentId] = useState<string | null>(null);
  const [commentEditing, setCommentEditing] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  // Per-room leaderboard + per-question action loading state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [progressBusyId, setProgressBusyId] = useState<string | null>(null);

  // Settings drawer (host controls + invite + members + leave)
  const [showSettings, setShowSettings] = useState(false);

  // Lobby chat drawer (always-on persistent thread)
  const [showChat, setShowChat] = useState(false);

  // Live-call presence for the active lobby: how many people are currently in
  // the LiveKit call (polled), so members who haven't joined get a cue.
  const [liveCall, setLiveCall] = useState<{
    count: number;
    participants: { identity: string; name: string }[];
  }>({ count: 0, participants: [] });

  // Active questions tab - "todo" (default) or "done". Only one bucket is
  // visible at a time so the page stays focused.
  const [questionTab, setQuestionTab] = useState<"todo" | "done">("todo");

  // Cards are collapsed by default; this set tracks which RoomChallenge ids
  // the user has clicked to expand. Click on the card header to toggle.
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const [progressMsg, setProgressMsg] = useState<{ id: string; text: string; type: "ok" | "err" } | null>(null);

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/room/invite");
      const data = await res.json();
      if (res.ok) {
        setInvites(data.invites || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/leaderboard?filter=friends");
      const data = await res.json();
      if (res.ok) {
        setFriends(data.rankings || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user);

      // Fetch joined rooms from DB (Prisma relation check)
      const res = await fetch("/api/room/list");
      const listData = await res.json();
      if (res.ok) {
        setJoinedRooms(listData.rooms || []);
      }

      await fetchInvites();
      await fetchFriends();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveRoomDetails = async (roomId: string) => {
    try {
      const [detailsRes, challengesRes, leaderboardRes, liveRes] =
        await Promise.all([
          fetch(`/api/room/details?roomId=${roomId}`),
          fetch(`/api/room/challenge?roomId=${roomId}`),
          fetch(`/api/room/leaderboard?roomId=${roomId}`),
          fetch(`/api/livekit/active?roomId=${roomId}`),
        ]);

      const detailsData = await detailsRes.json();
      if (detailsRes.ok) setRoomDetails(detailsData.room);

      const challengesData = await challengesRes.json();
      if (challengesRes.ok) setRoomChallenges(challengesData.challenges || []);

      const leaderboardData = await leaderboardRes.json();
      if (leaderboardRes.ok) setLeaderboard(leaderboardData.leaderboard || []);

      const liveData = await liveRes.json();
      if (liveRes.ok) {
        setLiveCall({
          count: liveData.count || 0,
          participants: liveData.participants || [],
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddHostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !questionUrl.trim()) return;
    setQuestionLoading(true);
    setQuestionError("");
    try {
      const res = await fetch("/api/room/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          url: questionUrl.trim(),
          problemName: questionName.trim() || undefined,
          problemNumber: questionNumber.trim()
            ? Number(questionNumber.trim())
            : undefined,
          difficulty: questionDifficulty,
          topic: questionTopic,
          comment: questionComment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuestionError(data.error || "Failed to add question.");
      } else {
        setQuestionUrl("");
        setQuestionName("");
        setQuestionNumber("");
        setQuestionComment("");
        fetchActiveRoomDetails(activeRoomId);
      }
    } catch (e) {
      setQuestionError("Network error while adding question.");
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleSaveComment = async (roomChallengeId: string) => {
    setCommentBusy(true);
    try {
      const res = await fetch("/api/room/question", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomChallengeId, comment: commentDraft }),
      });
      const data = await res.json();
      if (res.ok) {
        // Patch the local state so the popup reflects the saved value instantly.
        setRoomChallenges((prev) =>
          prev.map((rc) =>
            rc.id === roomChallengeId
              ? { ...rc, comment: data.comment ?? null }
              : rc
          )
        );
        setCommentEditing(false);
        if (!data.comment) setOpenCommentId(null);
      }
    } catch {
      /* ignore - keep editor open so the user can retry */
    } finally {
      setCommentBusy(false);
    }
  };

  const flashProgressMsg = (id: string, text: string, type: "ok" | "err") => {
    setProgressMsg({ id, text, type });
    setTimeout(() => setProgressMsg(null), 3500);
  };

  const handleQuestionAction = async (
    roomChallengeId: string,
    action: "claim" | "verify" | "preSolved" | "reset"
  ) => {
    setProgressBusyId(roomChallengeId + ":" + action);
    try {
      const res = await fetch("/api/room/question/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomChallengeId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        flashProgressMsg(roomChallengeId, data.error || "Failed.", "err");
      } else if (action === "verify") {
        if (data.verified) {
          flashProgressMsg(
            roomChallengeId,
            data.alreadyAwarded
              ? "Already verified earlier - nice."
              : `Verified on LeetCode! +${data.xpAwarded} XP added to your lobby score.`,
            "ok"
          );
        } else if (data.reason === "notFoundInSubmissions") {
          flashProgressMsg(
            roomChallengeId,
            "We couldn't find this problem in your recent LeetCode submissions. Solve it on leetcode.com first, then click Verify again.",
            "err"
          );
        } else if (data.reason === "preSolved") {
          flashProgressMsg(
            roomChallengeId,
            "You marked this as solved before joining - no XP. Use \"Change my answer\" to undo.",
            "err"
          );
        } else {
          flashProgressMsg(roomChallengeId, "Verification failed.", "err");
        }
      } else if (action === "claim") {
        flashProgressMsg(
          roomChallengeId,
          "Marked as done. Click \"Verify on LeetCode\" when your submission is live to earn XP.",
          "ok"
        );
      } else if (action === "preSolved") {
        flashProgressMsg(
          roomChallengeId,
          "Marked as already solved before joining (no XP). You can change this with \"Change my answer\".",
          "ok"
        );
      } else if (action === "reset") {
        flashProgressMsg(roomChallengeId, "Your answer was reset. Pick again whenever you're ready.", "ok");
      }
      if (activeRoomId) fetchActiveRoomDetails(activeRoomId);
    } catch (err) {
      flashProgressMsg(roomChallengeId, "Network error.", "err");
    } finally {
      setProgressBusyId(null);
    }
  };

  const handleDeleteQuestion = async (roomChallengeId: string) => {
    const ok = window.confirm(
      "Remove this question from the lobby?\n\nAll members will lose their progress on it. This cannot be undone."
    );
    if (!ok) return;
    setProgressBusyId(roomChallengeId + ":delete");
    try {
      const res = await fetch(
        `/api/room/question?roomChallengeId=${encodeURIComponent(roomChallengeId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        flashProgressMsg(roomChallengeId, data.error || "Failed to delete.", "err");
      } else if (activeRoomId) {
        fetchActiveRoomDetails(activeRoomId);
      }
    } catch (err) {
      flashProgressMsg(roomChallengeId, "Network error.", "err");
    } finally {
      setProgressBusyId(null);
    }
  };

  const handleRespondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      const res = await fetch("/api/room/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", inviteId, accept }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchRooms();
        if (accept && data.result?.roomId) {
          setActiveRoomId(data.result.roomId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendInvite = async (receiverId: string) => {
    if (!activeRoomId) return;
    setInviteSuccessMsg("");
    setInviteErrorMsg("");
    try {
      const res = await fetch("/api/room/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", receiverId, roomId: activeRoomId }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccessMsg("Invitation sent successfully!");
        setTimeout(() => setInviteSuccessMsg(""), 3000);
      } else {
        setInviteErrorMsg(data.error || "Failed to send invitation.");
        setTimeout(() => setInviteErrorMsg(""), 3000);
      }
    } catch (e) {
      setInviteErrorMsg("An unexpected error occurred.");
      setTimeout(() => setInviteErrorMsg(""), 3000);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (activeRoomId) {
      fetchActiveRoomDetails(activeRoomId);
      const interval = setInterval(() => fetchActiveRoomDetails(activeRoomId), 10000);
      return () => clearInterval(interval);
    }
  }, [activeRoomId]);

  // Deep-link support: if the URL is `/rooms?roomId=<id>` (e.g. from the sidebar
  // lobby shortcut), pre-select that lobby as soon as the joined list is loaded
  // and confirms membership.
  useEffect(() => {
    const target = searchParams.get("roomId");
    if (!target) return;
    if (activeRoomId === target) return;
    if (joinedRooms.some((r) => r.id === target)) {
      setActiveRoomId(target);
    }
  }, [searchParams, joinedRooms, activeRoomId]);

  // Close the settings drawer when there's no active lobby anymore
  // (e.g. user leaves the room while drawer is open).
  useEffect(() => {
    if (!activeRoomId) {
      setShowSettings(false);
      setShowChat(false);
      setLiveCall({ count: 0, participants: [] });
    }
  }, [activeRoomId]);

  // Esc-key closes the settings drawer.
  useEffect(() => {
    if (!showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSettings]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewRoomName("");
        setJoinedRooms((prev) => [...prev, data.room]);
        setActiveRoomId(data.room.id);
      } else {
        setActionError(data.error || "Failed to create room.");
      }
    } catch (err) {
      setActionError("Error creating challenge room.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim() || roomCodeInput.trim().length !== 6) return;
    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: roomCodeInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRoomCodeInput("");
        fetchRooms(); // reload list
        setActiveRoomId(data.room.id);
      } else {
        setActionError(data.error || "Failed to join room.");
      }
    } catch (err) {
      setActionError("Error joining lobby.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId) return;
    setAssignLoading(true);

    try {
      const res = await fetch("/api/room/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          topic: assignTopic,
          difficulty: assignDifficulty,
          count: assignCount,
        }),
      });
      if (res.ok) {
        fetchActiveRoomDetails(activeRoomId); // reload challenges list
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    try {
      const res = await fetch(`/api/room/details?roomId=${activeRoomId}`, { method: "DELETE" });
      if (res.ok) {
        setShowSettings(false);
        setActiveRoomId(null);
        setRoomDetails(null);
        setRoomChallenges([]);
        fetchRooms();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-muted-foreground text-sm font-medium">Entering lobbies area...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {activeRoomId && (
            <button
              onClick={() => {
                setActiveRoomId(null);
                setRoomDetails(null);
                setRoomChallenges([]);
              }}
              className="p-2 text-muted-foreground hover:text-foreground bg-card border border-border hover:border-border/80 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
            <h1 className="font-extrabold text-lg text-foreground">
              {roomDetails ? roomDetails.name : "Lobbies"}
            </h1>
          </div>
        </div>
      </nav>

      {/* Main content grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 gap-6 grid grid-cols-1 lg:grid-cols-3">
        
        {/* Left Side: Room details & Lobbies Navigation */}
        {!activeRoomId ? (
          /* Lobby Selection / Creation Area */
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Lobbies List & Pending Invites column */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" /> Active Joined Lobbies
                </h2>
                <p className="text-muted-foreground text-xs">
                  Jump back into your rooms to solve custom coding quests together.
                </p>
                
                {joinedRooms.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                    You haven&apos;t joined any lobbies. Create one or ask friends for a room code!
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {joinedRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setActiveRoomId(room.id)}
                        className="w-full text-left p-4 bg-muted/30 border border-border hover:border-indigo-500 rounded-xl transition flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-bold text-foreground text-sm">{room.name}</h3>
                          <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">
                            Code: {room.roomCode}
                          </span>
                        </div>
                        <LayoutGrid className="w-4.5 h-4.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lobby Invitations Inbox */}
              {invites.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h2 className="text-md font-bold flex items-center gap-2 text-indigo-400">
                    <Users className="w-4 h-4 text-indigo-400" /> Pending Invitations
                  </h2>
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div key={invite.id} className="p-4 bg-muted/30 border border-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{invite.room.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Invited by: {invite.sender.fullName || invite.sender.email.split("@")[0]}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespondToInvite(invite.id, true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondToInvite(invite.id, false)}
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
            </div>

            {/* Create or Join Forms */}
            <div className="space-y-6">
              {actionError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Join Room */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> Join Lobby via Code
                </h3>
                <form onSubmit={handleJoinRoom} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value)}
                    placeholder="LOBBYCODE"
                    className="flex-1 bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 px-4 text-center font-bold uppercase tracking-wider text-foreground placeholder:text-muted-foreground outline-none transition font-sans text-sm"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || roomCodeInput.trim().length !== 6}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white px-5 rounded-lg font-bold text-sm transition"
                  >
                    Join Lobby
                  </button>
                </form>
              </div>

              {/* Create Room */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" /> Create New Lobby
                </h3>
                <form onSubmit={handleCreateRoom} className="space-y-3">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Lobby name (e.g. DP Grinders)"
                    className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 px-4 text-foreground placeholder:text-muted-foreground outline-none transition font-sans text-sm"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading || !newRoomName.trim()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-lg font-bold text-sm transition"
                  >
                    Create Lobby
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE ROOM SCREEN DETAILS */
          <>
            {/* Left Column: Room Challenges and solved progress status */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                
                {/* Active challenge headers */}
                <div className="flex items-center justify-between border-b border-border/60 pb-4 gap-3">
                  <div className="min-w-0">
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Active Challenges</span>
                    <h2 className="text-xl font-black mt-1 text-foreground truncate">Lobby Task Board</h2>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {roomDetails && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Room Code</div>
                        <div className="font-extrabold text-indigo-400 font-mono tracking-widest text-sm flex items-center gap-1.5 mt-0.5">
                          {roomDetails.roomCode}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(roomDetails.roomCode);
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Copy Code"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    {(() => {
                      const inCall =
                        !!activeRoomId && call.isActive(activeRoomId);
                      // A call is live and I'm not in it → pull me in with a glow.
                      const liveJoinable = liveCall.count > 0 && !inCall;
                      return (
                        <button
                          onClick={() => {
                            if (!roomDetails || !activeRoomId) return;
                            // Already in this lobby's call → just bring the
                            // window back up; otherwise start/join it.
                            if (inCall) call.maximize();
                            else
                              call.startCall({
                                roomId: activeRoomId,
                                lobbyName: roomDetails.name,
                              });
                          }}
                          className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold transition ${
                            liveJoinable
                              ? "bg-emerald-500 hover:bg-emerald-400 ring-2 ring-emerald-400/60"
                              : "bg-emerald-600 hover:bg-emerald-500"
                          }`}
                          title={
                            liveJoinable
                              ? `Live call in progress — ${liveCall.count} in the call. Click to join.`
                              : inCall
                              ? "Open the call you're in"
                              : "Start or join the lobby call: voice, video & chat"
                          }
                        >
                          {liveJoinable && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                            </span>
                          )}
                          <Video className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            {liveJoinable
                              ? `Join call · ${liveCall.count}`
                              : inCall
                              ? call.connected
                                ? "Open call"
                                : "Connecting…"
                              : "Call"}
                          </span>
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => setShowChat(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                      title="Open the lobby chat — a live thread that persists across calls and supports media"
                    >
                      <MessagesSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 border border-border text-xs font-bold text-foreground transition"
                      title="Lobby settings: host controls, invites, members, leave"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Settings</span>
                    </button>
                  </div>
                </div>

                {/* Live call banner — shown to members who haven't joined yet. */}
                {liveCall.count > 0 &&
                  activeRoomId &&
                  !call.isActive(activeRoomId) && (
                    <button
                      onClick={() =>
                        roomDetails &&
                        call.startCall({
                          roomId: activeRoomId,
                          lobbyName: roomDetails.name,
                        })
                      }
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/30 hover:bg-emerald-500/[0.12] hover:border-emerald-500/50 transition group/livecall"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                          <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-bold text-foreground">
                            Live call in progress
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {liveCall.participants
                              .slice(0, 3)
                              .map((p) => p.name)
                              .join(", ")}
                            {liveCall.count > 3 &&
                              ` +${liveCall.count - 3} more`}
                            {liveCall.participants.length === 0 &&
                              `${liveCall.count} in the call`}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 group-hover/livecall:bg-emerald-500 text-white text-xs font-bold transition shrink-0">
                        <Video className="w-3.5 h-3.5" />
                        Join
                      </span>
                    </button>
                  )}

                {(() => {
                  if (roomChallenges.length === 0) {
                    return (
                      <div className="p-16 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                        No questions yet. Ask the host to paste a LeetCode link in the
                        "Add LeetCode Question" panel, or generate a topic batch.
                      </div>
                    );
                  }
                  // Bucket questions by the current user's progress: things I
                  // still need to act on vs things I've already finished. Both
                  // verified/preSolved and bank-auto-completed count as "done".
                  const myDone = (rc: RoomChallenge) => {
                    const me = rc.progress.find((p) => p.userId === currentUser?.id);
                    return !!(me?.verified || me?.markedPreSolved || me?.completed);
                  };
                  const pendingList = roomChallenges.filter((rc) => !myDone(rc));
                  const doneList = roomChallenges.filter(myDone);
                  const renderCard = (rc: RoomChallenge) => {
                      const myProgress = rc.progress.find(
                        (p) => p.userId === currentUser?.id
                      );
                      const verifyBusy =
                        progressBusyId === rc.id + ":verify";
                      const claimBusy = progressBusyId === rc.id + ":claim";
                      const preBusy = progressBusyId === rc.id + ":preSolved";
                      const resetBusy = progressBusyId === rc.id + ":reset";
                      const deleteBusy = progressBusyId === rc.id + ":delete";
                      const msg = progressMsg?.id === rc.id ? progressMsg : null;
                      const isHost =
                        !!roomDetails &&
                        !!currentUser &&
                        roomDetails.creatorId === currentUser.id;
                      const hasAnswer =
                        !!(myProgress?.claimed || myProgress?.verified || myProgress?.markedPreSolved);

                      // Status pill for the collapsed header - mirrors the
                      // myProgress state so users can scan what's pending
                      // without opening every card.
                      const myStatus = myProgress?.verified
                        ? {
                            text: `Verified · +${myProgress.xpAwarded ?? rc.challenge.xpReward} XP`,
                            cls:
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                          }
                        : myProgress?.markedPreSolved
                        ? {
                            text: "Already solved",
                            cls:
                              "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
                          }
                        : myProgress?.claimed
                        ? {
                            text: "Done · verify pending",
                            cls:
                              "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                          }
                        : myProgress?.completed
                        ? {
                            text: "Solved (synced)",
                            cls:
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                          }
                        : null;
                      const adder = rc.addedBy;
                      const adderName = adder
                        ? adder.fullName || adder.email.split("@")[0]
                        : null;
                      const isAdder =
                        !!(adder && currentUser && adder.id === currentUser.id);
                      // Both the lobby host and the original adder can delete
                      // the question. Bank-generated batches stay immutable.
                      const canDelete = (isHost || isAdder) && rc.isHostQuestion;
                      const isExpanded = expandedCards.has(rc.id);

                      const hasComment = !!(rc.comment && rc.comment.trim());
                      const commentOpen = openCommentId === rc.id;
                      // The note popup shows when explicitly opened (click) OR
                      // while the user hovers the circle/popup.
                      const noteOpen = commentOpen || hoverCommentId === rc.id;
                      const startCommentEdit = () => {
                        setOpenCommentId(rc.id);
                        setCommentDraft(rc.comment || "");
                        setCommentEditing(true);
                      };
                      const toggleCommentView = () => {
                        if (commentOpen) {
                          setOpenCommentId(null);
                          setCommentEditing(false);
                        } else {
                          setOpenCommentId(rc.id);
                          setCommentDraft(rc.comment || "");
                          // Adder with no note yet → jump straight into editing.
                          setCommentEditing(isAdder && !hasComment);
                        }
                      };
                      const closeComment = () => {
                        setCommentEditing(false);
                        if (!hasComment) setOpenCommentId(null);
                      };

                      return (
                        <div key={rc.id} className="relative">
                          {/* Always-visible note circle on the LEFT of the
                              question. Hover or click it to reveal the note. */}
                          {(hasComment || isAdder) && (
                            <div
                              className="absolute left-0 top-5 z-30"
                              style={{ transform: "translateX(-100%)" }}
                              onMouseEnter={() => setHoverCommentId(rc.id)}
                              onMouseLeave={() => setHoverCommentId(null)}
                            >
                              <div className="relative pr-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHoverCommentId(rc.id);
                                    toggleCommentView();
                                  }}
                                  title={
                                    hasComment
                                      ? "View note"
                                      : isAdder
                                      ? "Add a note"
                                      : "No note yet"
                                  }
                                  className={`relative flex items-center justify-center w-7 h-7 rounded-full border transition shadow-sm ${
                                    hasComment
                                      ? "bg-indigo-500 border-indigo-400 text-white hover:bg-indigo-400"
                                      : "bg-card border-dashed border-border text-muted-foreground hover:text-indigo-500 hover:border-indigo-400"
                                  } ${noteOpen ? "ring-2 ring-indigo-400/60" : ""}`}
                                >
                                  {hasComment ? (
                                    <MessageSquareText className="w-3.5 h-3.5" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                  {hasComment && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-300 ring-2 ring-card" />
                                  )}
                                </button>

                                {/* Note popup — opens to the RIGHT of the circle
                                    (over the card) so it's never clipped by the
                                    left edge. `pl-2` is a transparent hover
                                    bridge so the pointer can travel across. */}
                                {noteOpen && (
                                  <div className="absolute top-0 left-full pl-2 z-30 animate-in fade-in slide-in-from-left-1 duration-150">
                                    <div className="relative w-64 bg-popover border border-border rounded-xl shadow-xl p-3">
                                      <div className="absolute top-2.5 -left-1.5 w-3 h-3 rotate-45 bg-popover border-l border-b border-border" />
                                      <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                          <MessageSquareText className="w-3 h-3" /> Note
                                          {adderName && (
                                            <span className="normal-case font-semibold text-foreground/80">
                                              · {isAdder ? "you" : adderName}
                                            </span>
                                          )}
                                        </span>
                                        {isAdder && !commentEditing && (
                                          <button
                                            type="button"
                                            onClick={startCommentEdit}
                                            title={hasComment ? "Edit note" : "Add note"}
                                            className="text-muted-foreground hover:text-indigo-500 transition"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                      {commentEditing && isAdder ? (
                                        <div className="space-y-2">
                                          <textarea
                                            value={commentDraft}
                                            onChange={(e) => setCommentDraft(e.target.value)}
                                            maxLength={500}
                                            rows={4}
                                            autoFocus
                                            placeholder="Add a hint, approach, or why you picked this…"
                                            className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs outline-none resize-none"
                                          />
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={closeComment}
                                              className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70 border border-border transition"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleSaveComment(rc.id)}
                                              disabled={commentBusy}
                                              className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 inline-flex items-center gap-1"
                                            >
                                              {commentBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                                              Save
                                            </button>
                                          </div>
                                        </div>
                                      ) : hasComment ? (
                                        <p className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                          {rc.comment}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                          {isAdder
                                            ? "Add a note for your lobby."
                                            : "No note yet."}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="bg-muted/30 border border-border rounded-xl overflow-hidden transition-colors">
                          {/* Always-visible header - clicking anywhere toggles
                              the body. Delete button stops propagation. */}
                          <button
                            type="button"
                            onClick={() => toggleCardExpanded(rc.id)}
                            aria-expanded={isExpanded}
                            className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-muted/40 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <ChevronDown
                                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                                {typeof rc.problemNumber === "number" && (
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    #{rc.problemNumber}
                                  </span>
                                )}
                                <h4 className="font-bold text-foreground text-sm truncate">
                                  {rc.challenge.title}
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mt-1.5 ml-6">
                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                                  {rc.challenge.difficulty}
                                </span>
                                {adderName ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5">
                                    <UserCircle2 className="w-3 h-3" />
                                    Added by{" "}
                                    <span className="text-foreground font-semibold">
                                      {isAdder ? "you" : adderName}
                                    </span>
                                  </span>
                                ) : rc.isHostQuestion ? (
                                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20 rounded-full px-2 py-0.5">
                                    Host pick
                                  </span>
                                ) : null}
                                {myStatus && (
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${myStatus.cls}`}
                                  >
                                    {myStatus.text}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-indigo-400">
                                +{rc.challenge.xpReward} XP
                              </span>
                              {canDelete && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteQuestion(rc.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteQuestion(rc.id);
                                    }
                                  }}
                                  title={
                                    isHost && !isAdder
                                      ? "Remove this question from the lobby (host)"
                                      : "Remove the question you added"
                                  }
                                  className={`p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition ${
                                    deleteBusy ? "opacity-50 pointer-events-none" : ""
                                  }`}
                                >
                                  {deleteBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Expanded body - problems, actions, member strip. */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-4 border-t border-border/60">
                              <div className="grid gap-2 pt-4">
                                {rc.challenge.problems.map((prob) => (
                                  <div key={prob.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-xs">
                                    <div className="min-w-0">
                                      <span className="font-bold text-foreground">{prob.problemName}</span>
                                      <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium ml-2 uppercase">
                                        {prob.topic}
                                      </span>
                                    </div>
                                    <a
                                      href={`https://leetcode.com/problems/${prob.problemSlug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition shrink-0"
                                    >
                                      Solve <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ))}
                              </div>

                          {/* Per-user actions (only for host-added questions) */}
                          {rc.isHostQuestion && (
                            <div className="border-t border-border/60 pt-3 space-y-2">
                              {myProgress?.verified ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-lg px-3 py-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Verified on LeetCode, +{myProgress.xpAwarded ?? rc.challenge.xpReward} XP added to your lobby score.
                                  </div>
                                  <button
                                    onClick={() => handleQuestionAction(rc.id, "reset")}
                                    disabled={resetBusy}
                                    className="text-[10.5px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
                                    title="Reset my answer for this question. Your lobby XP for it is removed."
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    {resetBusy ? "Resetting…" : "Change my answer / remove submission"}
                                  </button>
                                </div>
                              ) : myProgress?.markedPreSolved ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    You marked this as solved before joining - no XP.
                                  </div>
                                  <button
                                    onClick={() => handleQuestionAction(rc.id, "reset")}
                                    disabled={resetBusy}
                                    className="text-[10.5px] font-semibold text-indigo-500 hover:text-indigo-400 inline-flex items-center gap-1 disabled:opacity-50"
                                    title="Undo this choice and pick again"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    {resetBusy ? "Undoing…" : "Wait, I want to change this"}
                                  </button>
                                </div>
                              ) : myProgress?.claimed ? (
                                <div className="space-y-2">
                                  <div className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
                                    You marked this as done. Click <b>Verify on LeetCode</b> once your submission is live to earn the XP.
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => handleQuestionAction(rc.id, "verify")}
                                      disabled={verifyBusy}
                                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-lg px-3 py-1.5 text-[11px] font-bold transition flex items-center gap-1.5"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      {verifyBusy ? "Checking LeetCode…" : `Verify on LeetCode (+${rc.challenge.xpReward} XP)`}
                                    </button>
                                    <button
                                      onClick={() => handleQuestionAction(rc.id, "reset")}
                                      disabled={resetBusy}
                                      className="text-[10.5px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      {resetBusy ? "Undoing…" : "Undo \"Done\""}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="text-[11px] text-muted-foreground">
                                    Pick one of the options below. <b>You can change your choice later</b> if you click by mistake.
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => handleQuestionAction(rc.id, "verify")}
                                      disabled={verifyBusy}
                                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-lg px-3 py-1.5 text-[11px] font-bold transition flex items-center gap-1.5"
                                      title="Check my latest LeetCode submissions and award XP if this problem is solved."
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      {verifyBusy ? "Checking LeetCode…" : `I solved it - verify (+${rc.challenge.xpReward} XP)`}
                                    </button>
                                    <button
                                      onClick={() => handleQuestionAction(rc.id, "claim")}
                                      disabled={claimBusy}
                                      className="bg-card hover:bg-muted border border-border rounded-lg px-3 py-1.5 text-[11px] font-bold text-foreground transition flex items-center gap-1.5"
                                      title="Mark as done now and verify on LeetCode later."
                                    >
                                      <CircleDashed className="w-3.5 h-3.5" />
                                      {claimBusy ? "Marking…" : "Mark done, verify later"}
                                    </button>
                                    <button
                                      onClick={() => handleQuestionAction(rc.id, "preSolved")}
                                      disabled={preBusy}
                                      className="bg-muted hover:bg-muted/70 border border-border rounded-lg px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition"
                                      title="I had already solved this before joining the lobby. No XP."
                                    >
                                      {preBusy ? "Saving…" : "Already solved before joining (no XP)"}
                                    </button>
                                  </div>
                                </div>
                              )}
                              {msg && (
                                <div
                                  className={`text-[10.5px] font-medium ${
                                    msg.type === "ok"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Per-member progress strip */}
                          <div className="border-t border-border/60 pt-3">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-2">Member Progress</span>
                            <div className="grid gap-2.5">
                              {rc.progress.map((prog) => {
                                let label = "Working";
                                let style =
                                  "bg-muted text-muted-foreground border border-border";
                                if (prog.verified) {
                                  label = `Verified · +${prog.xpAwarded ?? 0} XP`;
                                  style =
                                    "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40";
                                } else if (prog.markedPreSolved) {
                                  label = "Solved earlier";
                                  style =
                                    "bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/40";
                                } else if (prog.completed) {
                                  label = "Solved All";
                                  style =
                                    "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40";
                                } else if (prog.claimed) {
                                  label = "Claimed · awaiting verify";
                                  style =
                                    "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40";
                                }
                                return (
                                  <div key={prog.userId} className="flex items-center justify-between text-xs">
                                    <span className="text-foreground">{prog.user.fullName || prog.user.email.split("@")[0]}</span>
                                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${style}`}>
                                      {label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                            </div>
                          )}
                          </div>
                        </div>
                      );
                    };
                  const activeList = questionTab === "todo" ? pendingList : doneList;
                  return (
                    <div className="space-y-5">
                      {/* Tab bar - two equal columns, only one list visible at a time.
                          Counts on each tab so users see what's in the other bucket
                          without switching. */}
                      <div
                        role="tablist"
                        aria-label="Filter questions by status"
                        className="grid grid-cols-2 gap-2 p-1 bg-muted/40 border border-border rounded-xl"
                      >
                        {([
                          { key: "todo", label: "To do", count: pendingList.length },
                          { key: "done", label: "Done", count: doneList.length },
                        ] as const).map((tab) => {
                          const isActive = questionTab === tab.key;
                          return (
                            <button
                              key={tab.key}
                              role="tab"
                              aria-selected={isActive}
                              onClick={() => setQuestionTab(tab.key)}
                              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition ${
                                isActive
                                  ? "bg-card text-foreground shadow-sm border border-border"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span>{tab.label}</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  isActive
                                    ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-300"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {tab.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active bucket. Empty-states are bucket-specific so the
                          page never sits on a blank panel. */}
                      <div role="tabpanel">
                        {activeList.length === 0 ? (
                          questionTab === "todo" ? (
                            <div className="p-8 text-center border border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-xl">
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                All caught up - great work.
                              </p>
                              <p className="text-[10.5px] text-muted-foreground mt-1">
                                Wait for the host to add more, or generate a fresh batch from Settings.
                              </p>
                            </div>
                          ) : (
                            <div className="p-8 text-center border border-dashed border-border rounded-xl">
                              <p className="text-xs font-bold text-foreground">
                                Nothing finished yet.
                              </p>
                              <p className="text-[10.5px] text-muted-foreground mt-1">
                                Solve a question and click Verify to see it land here.
                              </p>
                            </div>
                          )
                        ) : (
                          <div className="space-y-6">{activeList.map(renderCard)}</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column: Host settings & members list */}
            <div className="space-y-6">

              {/* Add LeetCode Question - any lobby member can add. */}
              {roomDetails && currentUser && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-indigo-400" /> Add a LeetCode question
                  </h3>
                  <p className="text-[11px] text-muted-foreground -mt-2">
                    Any member can add. Paste the full LeetCode problem URL (e.g. <span className="font-mono">https://leetcode.com/problems/valid-anagram/</span>) or just the slug (<span className="font-mono">valid-anagram</span>). Everyone in the lobby will see it; you can remove anything you added.
                  </p>

                  <form onSubmit={handleAddHostQuestion} className="space-y-3">
                    <input
                      type="text"
                      value={questionUrl}
                      onChange={(e) => setQuestionUrl(e.target.value)}
                      placeholder="https://leetcode.com/problems/valid-anagram/"
                      className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition font-mono"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={questionNumber}
                        onChange={(e) => setQuestionNumber(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="LC #"
                        className="bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition font-mono"
                      />
                      <select
                        value={questionDifficulty}
                        onChange={(e) => setQuestionDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")}
                        className="bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition"
                      >
                        <option value="EASY">EASY · +20 XP</option>
                        <option value="MEDIUM">MEDIUM · +40 XP</option>
                        <option value="HARD">HARD · +80 XP</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={questionName}
                        onChange={(e) => setQuestionName(e.target.value)}
                        placeholder="Custom name (optional)"
                        className="bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition"
                      />
                      <select
                        value={questionTopic}
                        onChange={(e) => setQuestionTopic(e.target.value)}
                        className="bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition"
                      >
                        {["Arrays", "Strings", "Binary Search", "Trees", "Graph", "DP", "Linked List", "Heap", "HashMap", "Greedy", "Sliding Window", "Backtracking", "General"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={questionComment}
                      onChange={(e) => setQuestionComment(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Add a note for the lobby (optional) — a hint, approach, or why you picked it"
                      className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition resize-none"
                    />
                    {questionError && (
                      <p className="text-rose-500 text-[10.5px] font-medium">{questionError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={questionLoading || !questionUrl.trim()}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      {questionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {questionLoading ? "Adding…" : "Add Question to Lobby"}
                    </button>
                  </form>
                </div>
              )}

              {/* Lobby Leaderboard - visible to all members */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> Lobby Leaderboard
                  </h3>
                  {activeRoomId && (
                    <Link
                      href={`/rooms/${activeRoomId}/leaderboard`}
                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-500 hover:text-indigo-400 transition"
                      title="Open the full leaderboard with charts, rankings and activity history"
                    >
                      Open
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                {leaderboard.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No XP earned yet. Solve a question and click Verify to appear here.</p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {leaderboard.map((entry) => {
                      const isMe = entry.userId === currentUser?.id;
                      const medal =
                        entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
                      return (
                        <Link
                          href={`/${entry.username || entry.userId}`}
                          key={entry.userId}
                          className={`flex items-center justify-between py-2 group ${
                            isMe ? "bg-indigo-500/5 -mx-3 px-3 rounded-md" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono w-5 text-center text-muted-foreground">
                              {medal || `#${entry.rank}`}
                            </span>
                            <UserAvatar
                              url={entry.avatarUrl}
                              name={entry.fullName}
                              email={entry.email}
                              size={22}
                              className="shrink-0"
                            />
                            {entry.rank === 1 && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-indigo-500 transition">
                              {entry.fullName || entry.email.split("@")[0]}
                              {isMe && <span className="text-[10px] text-indigo-400 ml-1">(you)</span>}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black font-mono text-indigo-500 dark:text-indigo-400">
                              {entry.xp} XP
                            </div>
                            <div className="text-[9px] text-muted-foreground font-mono">
                              {entry.verified}✓
                              {entry.preSolved > 0 && <> · {entry.preSolved}⌛</>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Member count + settings shortcut.
                  Host controls, invites, members list and Leave button have
                  moved into the Settings drawer to declutter the page. */}
              {roomDetails && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" /> Members
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                      {roomDetails.members.length}
                    </span>
                  </h3>
                  <div className="flex -space-x-2 overflow-hidden">
                    {roomDetails.members.slice(0, 6).map((m) => (
                      <div
                        key={m.id}
                        title={m.user.fullName || m.user.email.split("@")[0]}
                        className="ring-2 ring-card rounded-full"
                      >
                        <UserAvatar
                          url={m.user.avatarUrl}
                          name={m.user.fullName}
                          email={m.user.email}
                          size={28}
                        />
                      </div>
                    ))}
                    {roomDetails.members.length > 6 && (
                      <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                        +{roomDetails.members.length - 6}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-full py-2 bg-muted hover:bg-muted/70 text-foreground border border-border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Lobby settings &amp; invites
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Slide-in settings drawer ─ host controls, invites, members, leave.
          Lives outside <main> so it can overlay the whole page. */}
      {showSettings && roomDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <aside
            className="fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-card border-l border-border shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Lobby settings"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="min-w-0">
                <h2 className="font-black text-base text-foreground truncate">
                  {roomDetails.name}
                </h2>
                <p className="text-[10.5px] font-mono text-muted-foreground">
                  Lobby settings · #{roomDetails.roomCode}
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Host controls - only the host sees this. */}
              {currentUser && roomDetails.creatorId === currentUser.id && (
                <section className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    Host controls
                  </h3>
                  <p className="text-[10.5px] text-muted-foreground -mt-1">
                    Auto-generate a topic batch from the question bank.
                  </p>
                  <form onSubmit={handleAssignChallenge} className="space-y-3">
                    <div>
                      <label className="block text-muted-foreground text-[10.5px] font-bold uppercase tracking-wider mb-1">Topic</label>
                      <select
                        value={assignTopic}
                        onChange={(e) => setAssignTopic(e.target.value)}
                        className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition"
                      >
                        {["Arrays", "Strings", "Binary Search", "Trees", "Graph", "DP"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-muted-foreground text-[10.5px] font-bold uppercase tracking-wider mb-1">Difficulty</label>
                        <select
                          value={assignDifficulty}
                          onChange={(e) => setAssignDifficulty(e.target.value)}
                          className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition"
                        >
                          {["EASY", "MEDIUM", "HARD"].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-muted-foreground text-[10.5px] font-bold uppercase tracking-wider mb-1">Count</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={assignCount}
                          onChange={(e) => setAssignCount(Number(e.target.value))}
                          className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={assignLoading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-lg font-bold text-xs transition"
                    >
                      {assignLoading ? "Generating…" : "Generate lobby challenge"}
                    </button>
                  </form>
                </section>
              )}

              {/* Invite friends */}
              <section className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> Invite friends
                </h3>
                {friends.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No friends yet. Add some from the Leaderboard tab to invite them here.
                  </p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {friends.map((friend) => {
                      const isAlreadyMember = roomDetails.members.some((m) => m.user.id === friend.id);
                      return (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-2 bg-background border border-border rounded-lg text-xs"
                        >
                          <span className="text-foreground truncate">
                            {friend.fullName || friend.email.split("@")[0]}
                          </span>
                          <button
                            onClick={() => handleSendInvite(friend.id)}
                            disabled={isAlreadyMember}
                            className={`px-2 py-1 rounded font-bold text-[10px] transition shrink-0 ${
                              isAlreadyMember
                                ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                            }`}
                          >
                            {isAlreadyMember ? "Member" : "Invite"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {inviteSuccessMsg && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">{inviteSuccessMsg}</p>
                )}
                {inviteErrorMsg && (
                  <p className="text-rose-600 dark:text-rose-400 text-[10px] font-medium">{inviteErrorMsg}</p>
                )}
              </section>

              {/* Members list */}
              <section className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> Members
                  <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                    {roomDetails.members.length}
                  </span>
                </h3>
                <div className="divide-y divide-border/60">
                  {roomDetails.members.map((m) => {
                    const isLeader =
                      leaderboard.find((e) => e.rank === 1)?.userId === m.user.id;
                    const isHost = roomDetails.creatorId === m.user.id;
                    return (
                      <Link
                        href={`/${m.user.username || m.user.id}`}
                        key={m.id}
                        className="flex items-center justify-between py-2.5 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isLeader ? (
                            <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 shrink-0" />
                          )}
                          <UserAvatar
                            url={m.user.avatarUrl}
                            name={m.user.fullName}
                            email={m.user.email}
                            size={28}
                            className="shrink-0"
                          />
                          <span className="text-sm font-semibold text-foreground truncate group-hover:text-indigo-500 transition">
                            {m.user.fullName || m.user.email.split("@")[0]}
                          </span>
                          {isHost && (
                            <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">
                              Host
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-muted-foreground shrink-0">
                          🔥 {m.user.currentStreak}d
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Danger zone - leave lobby */}
              <section className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400">Danger zone</h3>
                <p className="text-[10.5px] text-muted-foreground">
                  Leaving the lobby removes you from all current and future questions.
                  Your earned XP stays in your account.
                </p>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full py-2 bg-rose-100 dark:bg-rose-950/30 hover:bg-rose-200 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900/50 rounded-lg text-xs font-bold transition"
                >
                  Leave lobby
                </button>
              </section>
            </div>
          </aside>
        </>
      )}

      {/* Always-on lobby chat drawer */}
      {showChat && activeRoomId && roomDetails && (
        <LobbyChat
          roomId={activeRoomId}
          currentUserId={currentUser?.id ?? null}
          lobbyName={roomDetails.name}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

export default function RoomsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RoomsPageInner />
    </Suspense>
  );
}
