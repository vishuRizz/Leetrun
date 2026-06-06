"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Video,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  PhoneOff,
  Sparkles,
} from "lucide-react";

const NAME_KEY = "leetrun:fun-room-name";

export default function FunRoom({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const shareLink =
    typeof window !== "undefined" ? window.location.href : `/room/${roomId}`;

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [shareLink]);

  const join = useCallback(async () => {
    const display = name.trim() || "Guest";
    setLoading(true);
    setError("");
    try {
      localStorage.setItem(NAME_KEY, display);
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch("/api/fun-room/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, name: display }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't join the room.");
        return;
      }
      setToken(data.token);
      setServerUrl(data.url);
      setJoined(true);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }, [name, roomId]);

  const leave = useCallback(() => {
    setJoined(false);
    setToken(null);
    router.push("/room");
  }, [router]);

  // ── In-call ──────────────────────────────────────────────────────────────
  if (joined && token && serverUrl) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video
          audio
          data-lk-theme="default"
          onDisconnected={leave}
          style={{ width: "100%", height: "100%" }}
        >
          <div className="flex flex-col h-full">
            <header
              className="flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0"
              style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0">
                  <Video className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight truncate">
                    Room {roomId}
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Just for fun
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition"
                  title="Copy the invite link"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={leave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                  title="Leave the room"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Leave</span>
                </button>
              </div>
            </header>
            <div className="flex-1 min-h-0">
              <VideoConference chatMessageFormatter={formatChatMessageLinks} />
            </div>
          </div>
        </LiveKitRoom>
      </div>
    );
  }

  // ── Pre-join lobby ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-7 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Just for fun
          </div>

          <h1 className="text-2xl font-black">You&apos;re about to join</h1>
          <p className="mt-1 text-white/80 text-sm">
            Room <span className="font-mono font-bold">{roomId}</span>
          </p>

          <label className="block mt-6 text-sm font-bold">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            placeholder="What should people call you?"
            maxLength={40}
            autoFocus
            className="mt-2 w-full rounded-xl bg-white/90 text-zinc-900 placeholder:text-zinc-500 px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-white"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-950/40 border border-rose-400/40 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-100">{error}</p>
            </div>
          )}

          <button
            onClick={join}
            disabled={loading}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-violet-700 font-black text-base px-6 py-3.5 shadow-xl hover:scale-[1.01] active:scale-95 transition disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Join room
              </>
            )}
          </button>

          <button
            onClick={copy}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm px-6 py-2.5 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                Link copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy invite link
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => router.push("/room")}
          className="mt-5 mx-auto block text-xs text-white/70 hover:text-white transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
