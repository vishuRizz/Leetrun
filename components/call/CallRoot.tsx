"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ParticipantTile,
  useChat,
  useLocalParticipant,
  useParticipants,
  useTracks,
  formatChatMessageLinks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import {
  Minimize2,
  Maximize2,
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Users,
  GripVertical,
} from "lucide-react";

interface CallRootProps {
  token: string;
  serverUrl: string;
  roomId: string;
  lobbyName: string;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onEnd: () => void;
  onConnected?: () => void;
  onError?: (message: string) => void;
}

type Corner = "tl" | "tr" | "bl" | "br";
const CORNER_KEY = "leetrun:call-corner";

function cornerStyle(corner: Corner): React.CSSProperties {
  const top = "max(0.75rem, env(safe-area-inset-top))";
  const bottom = "max(0.75rem, env(safe-area-inset-bottom))";
  const left = "max(0.75rem, env(safe-area-inset-left))";
  const right = "max(0.75rem, env(safe-area-inset-right))";
  switch (corner) {
    case "tl":
      return { top, left };
    case "tr":
      return { top, right };
    case "bl":
      return { bottom, left };
    default:
      return { bottom, right };
  }
}

export default function CallRoot({
  token,
  serverUrl,
  roomId,
  lobbyName,
  minimized,
  onMinimize,
  onMaximize,
  onEnd,
  onConnected,
  onError,
}: CallRootProps) {
  // Which corner the minimized player snaps to (persisted, user-draggable).
  const [corner, setCorner] = useState<Corner>("br");
  // Live pixel position while a drag is in progress (null when docked).
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CORNER_KEY) as Corner | null;
      if (saved && ["tl", "tr", "bl", "br"].includes(saved)) setCorner(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const onDragMove = useCallback((e: PointerEvent) => {
    const el = wrapRef.current;
    const d = dragRef.current;
    if (!el || !d) return;
    d.moved = true;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = Math.min(
      Math.max(8, e.clientX - d.dx),
      window.innerWidth - w - 8
    );
    const y = Math.min(
      Math.max(8, e.clientY - d.dy),
      window.innerHeight - h - 8
    );
    setDragXY({ x, y });
  }, []);

  const onDragEnd = useCallback(() => {
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
    const el = wrapRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const next: Corner = `${cy < window.innerHeight / 2 ? "t" : "b"}${
        cx < window.innerWidth / 2 ? "l" : "r"
      }` as Corner;
      setCorner(next);
      try {
        localStorage.setItem(CORNER_KEY, next);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
    setDragXY(null);
  }, [onDragMove]);

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Don't start a drag from the control buttons inside the header.
      if ((e.target as HTMLElement).closest("button")) return;
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      dragRef.current = {
        dx: e.clientX - r.left,
        dy: e.clientY - r.top,
        moved: false,
      };
      setDragXY({ x: r.left, y: r.top });
      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragEnd);
    },
    [onDragMove, onDragEnd]
  );

  // NOTE: positioning lives on this wrapper, NOT on <LiveKitRoom>. LiveKit
  // applies `.lk-room-container { position: relative }` to its own element,
  // which would override our `fixed` and drop the overlay into normal flow
  // (making it invisible). So we wrap it and let LiveKitRoom just fill us.
  return (
    <div
      ref={wrapRef}
      className={
        minimized
          ? "fixed z-[110] w-[300px] sm:w-[320px] max-w-[calc(100vw-1.5rem)] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl"
          : "fixed inset-0 z-[110] bg-black"
      }
      style={
        minimized
          ? dragXY
            ? { left: dragXY.x, top: dragXY.y }
            : cornerStyle(corner)
          : undefined
      }
    >
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        // Start with mic/cam off so a denied/blocked device never stalls the
        // connection - members enable them from the control bar.
        audio={false}
        video={false}
        onConnected={onConnected}
        onDisconnected={onEnd}
        onError={(e) =>
          onError?.(
            e?.message
              ? `Connection failed: ${e.message}`
              : "Connection to the call failed."
          )
        }
        data-lk-theme="default"
        style={{ width: "100%", height: minimized ? "auto" : "100%" }}
      >
        {/* Persists messages typed in the call into the lobby's always-on
            thread (sender-side only, so each message is saved exactly once). */}
        <CallChatPersister roomId={roomId} />
        {minimized ? (
          <MiniCall
            lobbyName={lobbyName}
            onMaximize={onMaximize}
            onEnd={onEnd}
            onDragStart={onDragStart}
            dragging={!!dragXY}
          />
        ) : (
          <MaxCall
            lobbyName={lobbyName}
            onMinimize={onMinimize}
            onEnd={onEnd}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}

/* ── Saves locally-sent call chat into the persistent lobby thread ── */
function CallChatPersister({ roomId }: { roomId: string }) {
  const { chatMessages } = useChat();
  const persisted = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const m of chatMessages) {
      // Only the author persists their own message → saved exactly once.
      if (!m.from?.isLocal) continue;
      if (persisted.current.has(m.id)) continue;
      persisted.current.add(m.id);
      fetch("/api/room/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: m.message, source: "call" }),
      }).catch(() => persisted.current.delete(m.id));
    }
  }, [chatMessages, roomId]);

  return null;
}

/* ── Maximized: full-screen prebuilt conference (grid + chat + controls) ── */
function MaxCall({
  lobbyName,
  onMinimize,
  onEnd,
}: {
  lobbyName: string;
  onMinimize: () => void;
  onEnd: () => void;
}) {
  const participants = useParticipants();
  return (
    <div className="flex flex-col h-full">
      <header
        className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-bold text-white truncate">{lobbyName}</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-zinc-400">
            <Users className="w-3 h-3" />
            {participants.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMinimize}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
            title="Minimize - keep the call running while you browse"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Minimize</span>
          </button>
          <button
            onClick={onEnd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
            title="Leave the call"
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
  );
}

/* ── Minimized: compact floating player with self controls (Meet-style) ── */
function MiniCall({
  lobbyName,
  onMaximize,
  onEnd,
  onDragStart,
  dragging,
}: {
  lobbyName: string;
  onMaximize: () => void;
  onEnd: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  dragging?: boolean;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const participants = useParticipants();
  const cameraTracks = useTracks([Track.Source.Camera]);
  // Prefer a remote participant's video; fall back to local self-view.
  const previewTrack =
    cameraTracks.find((t) => !t.participant.isLocal) ?? cameraTracks[0];

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };
  const toggleCam = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  return (
    <>
      {/* Audio must render here since we're not mounting VideoConference. */}
      <RoomAudioRenderer />

      {/* Header doubles as the drag handle — grab it to move the player to any
          corner; it snaps to the nearest one on release. */}
      <div
        onPointerDown={onDragStart}
        style={{ touchAction: "none" }}
        className={`flex items-center justify-between gap-2 px-3 py-2 bg-zinc-950 border-b border-zinc-800 select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        title="Drag to move • snaps to nearest corner"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-white truncate">{lobbyName}</span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-400 shrink-0">
            <Users className="w-3 h-3" />
            {participants.length}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onMaximize}
            title="Expand call"
            className="p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEnd}
            title="Leave call"
            className="p-1.5 rounded-md text-rose-400 hover:text-white hover:bg-rose-600 transition"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="relative h-36 bg-zinc-900">
        {previewTrack ? (
          <ParticipantTile
            trackRef={previewTrack}
            disableSpeakingIndicator
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 text-zinc-400">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] font-medium">
              Voice call · {participants.length} in call
            </span>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-950">
        <button
          onClick={toggleMic}
          title={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition ${
            isMicrophoneEnabled
              ? "bg-zinc-800 hover:bg-zinc-700 text-white"
              : "bg-rose-600 hover:bg-rose-500 text-white"
          }`}
        >
          {isMicrophoneEnabled ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={toggleCam}
          title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition ${
            isCameraEnabled
              ? "bg-zinc-800 hover:bg-zinc-700 text-white"
              : "bg-rose-600 hover:bg-rose-500 text-white"
          }`}
        >
          {isCameraEnabled ? (
            <VideoIcon className="w-4 h-4" />
          ) : (
            <VideoOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onEnd}
          title="Leave call"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
