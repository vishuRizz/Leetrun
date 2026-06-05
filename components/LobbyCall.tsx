"use client";

import React, { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, X, PhoneOff, AlertCircle } from "lucide-react";

interface LobbyCallProps {
  roomId: string;
  lobbyName: string;
  onClose: () => void;
}

/**
 * Full-screen LiveKit call overlay for a lobby. Bundles voice, video and text
 * chat via LiveKit's prebuilt `VideoConference` UI. A token is minted by
 * `/api/livekit/token` (membership-gated) and the room name is derived from the
 * lobby id server-side, so every member of the lobby lands in the same call.
 */
export default function LobbyCall({
  roomId,
  lobbyName,
  onClose,
}: LobbyCallProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Couldn't join the call.");
        }
        if (!cancelled) {
          setToken(data.token);
          setServerUrl(data.url);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Couldn't join the call.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Esc closes the call overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Slim header above the LiveKit stage */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-bold text-white truncate">
            {lobbyName}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 hidden sm:inline">
            Live call
          </span>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
          title="Leave & close call"
        >
          <X className="w-3.5 h-3.5" />
          Close
        </button>
      </header>

      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-300">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            <p className="text-sm font-medium">Connecting to the call…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-sm font-bold text-white">Can&apos;t join the call</p>
            <p className="text-xs text-zinc-400 max-w-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Back to lobby
            </button>
          </div>
        )}

        {!loading && !error && token && serverUrl && (
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect
            audio
            video={false}
            onDisconnected={onClose}
            data-lk-theme="default"
            style={{ height: "100%" }}
          >
            <VideoConference chatMessageFormatter={formatChatMessageLinks} />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}
