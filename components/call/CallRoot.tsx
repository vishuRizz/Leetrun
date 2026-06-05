"use client";

import React, { useEffect, useRef } from "react";
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
  // NOTE: positioning lives on this wrapper, NOT on <LiveKitRoom>. LiveKit
  // applies `.lk-room-container { position: relative }` to its own element,
  // which would override our `fixed` and drop the overlay into normal flow
  // (making it invisible). So we wrap it and let LiveKitRoom just fill us.
  return (
    <div
      className={
        minimized
          ? "fixed bottom-4 right-4 z-[110] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl"
          : "fixed inset-0 z-[110] bg-black"
      }
    >
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        // Start with mic/cam off so a denied/blocked device never stalls the
        // connection — members enable them from the control bar.
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
      <header className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
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
            title="Minimize — keep the call running while you browse"
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
}: {
  lobbyName: string;
  onMaximize: () => void;
  onEnd: () => void;
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

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 min-w-0">
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
