"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
      currentStreak: number;
    };
  }>;
}

interface RoomChallenge {
  id: string;
  deadline: string;
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
    userId: string;
    completed: boolean;
    user: {
      fullName: string | null;
      email: string;
    };
  }>;
}

export default function RoomsPage() {
  const router = useRouter();
  const supabase = createClient();

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
      const detailsRes = await fetch(`/api/room/details?roomId=${roomId}`);
      const detailsData = await detailsRes.json();
      if (detailsRes.ok) {
        setRoomDetails(detailsData.room);
      }

      const challengesRes = await fetch(`/api/room/challenge?roomId=${roomId}`);
      const challengesData = await challengesRes.json();
      if (challengesRes.ok) {
        setRoomChallenges(challengesData.challenges || []);
      }
    } catch (e) {
      console.error(e);
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
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div>
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Active Challenges</span>
                    <h2 className="text-xl font-black mt-1 text-foreground">Lobby Task Board</h2>
                  </div>
                  
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
                </div>

                {roomChallenges.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                    No active challenges assigned yet. Ask the room host to create one!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {roomChallenges.map((rc) => (
                      <div key={rc.id} className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-foreground text-sm">{rc.challenge.title}</h4>
                            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                              Difficulty: {rc.challenge.difficulty}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-400">+{rc.challenge.xpReward} XP</span>
                        </div>

                        <div className="grid gap-2">
                          {rc.challenge.problems.map((prob) => (
                            <div key={prob.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-xs">
                              <div>
                                <span className="font-bold text-foreground">{prob.problemName}</span>
                                <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium ml-2 uppercase">
                                  {prob.topic}
                                </span>
                              </div>
                              <a
                                href={`https://leetcode.com/problems/${prob.problemSlug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition"
                              >
                                Solve <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>

                        {/* Leaderboard stats for this challenge inside room */}
                        <div className="border-t border-border/60 pt-3">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-2">Member Progress</span>
                          <div className="grid gap-2.5">
                            {rc.progress.map((prog) => (
                              <div key={prog.userId} className="flex items-center justify-between text-xs">
                                <span className="text-foreground">{prog.user.fullName || prog.user.email.split("@")[0]}</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                                  prog.completed 
                                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40" 
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}>
                                  {prog.completed ? "Solved All" : "Working"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Host settings & members list */}
            <div className="space-y-6">
              
              {/* Host Settings (Visible if creatorId === currentUser.id) */}
              {roomDetails && currentUser && roomDetails.creatorId === currentUser.id && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400" /> Host Controls: Generate challenge
                  </h3>
                  
                  <form onSubmit={handleAssignChallenge} className="space-y-4">
                    <div>
                      <label className="block text-muted-foreground text-xs font-semibold mb-2">Topic</label>
                      <select
                        value={assignTopic}
                        onChange={(e) => setAssignTopic(e.target.value)}
                        className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition font-sans"
                      >
                        {["Arrays", "Strings", "Binary Search", "Trees", "Graph", "DP"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-muted-foreground text-xs font-semibold mb-2">Difficulty</label>
                      <select
                        value={assignDifficulty}
                        onChange={(e) => setAssignDifficulty(e.target.value)}
                        className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition font-sans"
                      >
                        {["EASY", "MEDIUM", "HARD"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-muted-foreground text-xs font-semibold mb-2">Question Count</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={assignCount}
                        onChange={(e) => setAssignCount(Number(e.target.value))}
                        className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2 text-xs text-foreground outline-none transition font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={assignLoading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white rounded-lg font-bold text-xs transition"
                    >
                      {assignLoading ? "Generating..." : "Generate Lobby Challenge"}
                    </button>
                  </form>
                </div>
              )}

              {/* Invite Friends Sidebar Card */}
              {roomDetails && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" /> Invite Friends
                  </h3>
                  
                  {friends.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No friends found. Add friends on the leaderboard page to invite them!</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {friends.map((friend) => {
                        const isAlreadyMember = roomDetails.members.some((m) => m.user.id === friend.id);
                        return (
                          <div key={friend.id} className="flex items-center justify-between p-2 bg-muted/30 border border-border rounded-lg text-xs">
                            <span className="text-foreground">{friend.fullName || friend.email.split("@")[0]}</span>
                            <button
                              onClick={() => handleSendInvite(friend.id)}
                              disabled={isAlreadyMember}
                              className={`px-2 py-1 rounded font-bold text-[10px] transition ${
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

                  {inviteSuccessMsg && <p className="text-emerald-600 dark:text-emerald-400 text-[10px] mt-1">{inviteSuccessMsg}</p>}
                  {inviteErrorMsg && <p className="text-rose-600 dark:text-rose-400 text-[10px] mt-1">{inviteErrorMsg}</p>}
                </div>
              )}

              {/* Lobby Members List */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-md mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> Lobby Members
                </h3>
                
                {roomDetails && (
                  <div className="divide-y divide-border/60">
                    {roomDetails.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                          {roomDetails.creatorId === m.user.id ? (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                          <span className="text-sm font-semibold text-foreground">
                            {m.user.fullName || m.user.email.split("@")[0]}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">Streak: {m.user.currentStreak}d</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleLeaveRoom}
                  className="w-full py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/20 hover:border-red-300 dark:hover:border-red-900/50 rounded-xl text-xs font-bold transition mt-4"
                >
                  Leave Lobby Room
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
