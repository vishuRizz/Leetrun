"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
  useLocalParticipant,
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
  Trash2,
  Mic,
  MicOff,
} from "lucide-react";

const NAME_KEY = "leetrun:fun-room-name";
const creatorKeyStorageKey = (roomId: string) =>
  `leetrun:fun-creator:${roomId}`;

export default function FunRoom({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatorKey, setCreatorKey] = useState<string | null>(null);
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [dissolving, setDissolving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
      setCreatorKey(localStorage.getItem(creatorKeyStorageKey(roomId)));
    } catch {
      /* ignore */
    }
  }, [roomId]);

  const isHost = !!creatorKey;

  // Always share the clean room URL (never any local query/state).
  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/fun-room/${roomId}`
      : `/fun-room/${roomId}`;

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
    router.push("/fun-room");
  }, [router]);

  const dissolve = useCallback(async () => {
    if (!creatorKey) return;
    setDissolving(true);
    try {
      await fetch("/api/fun-room/dissolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, creatorKey }),
      });
    } catch {
      /* even if it fails, fall through and leave */
    }
    try {
      localStorage.removeItem(creatorKeyStorageKey(roomId));
    } catch {
      /* ignore */
    }
    setDissolving(false);
    setConfirmDissolve(false);
    leave();
  }, [creatorKey, roomId, leave]);

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
                {isHost && (
                  <button
                    onClick={() => setConfirmDissolve(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-black transition shadow-lg shadow-rose-950/30"
                    title="End the room for everyone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dissolve</span>
                  </button>
                )}
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

            {confirmDissolve && (
              <DissolveConfirm
                busy={dissolving}
                onCancel={() => setConfirmDissolve(false)}
                onConfirm={dissolve}
              />
            )}
            <div className="flex-1 min-h-0">
              <VideoConference chatMessageFormatter={formatChatMessageLinks} />
            </div>
          </div>
          {/* Spacebar toggles the mic (ignored while typing in chat). */}
          <SpacebarMicToggle />
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

          {isHost && (
            <button
              onClick={() => setConfirmDissolve(true)}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-transparent hover:bg-white/10 border border-white/30 text-white/90 font-semibold text-xs px-6 py-2.5 transition"
              title="End the room for everyone"
            >
              <Trash2 className="w-4 h-4" />
              End this room for everyone
            </button>
          )}
        </div>

        {confirmDissolve && (
          <DissolveConfirm
            busy={dissolving}
            onCancel={() => setConfirmDissolve(false)}
            onConfirm={dissolve}
          />
        )}

        <button
          onClick={() => router.push("/fun-room")}
          className="mt-5 mx-auto block text-xs text-white/70 hover:text-white transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function SpacebarMicToggle() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const enabledRef = useRef(isMicrophoneEnabled);
  enabledRef.current = isMicrophoneEnabled;

  // null = hidden; otherwise the mic state to flash on-screen briefly.
  const [flash, setFlash] = useState<boolean | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (e.repeat) return;
      // Don't hijack the space key while typing (e.g. the in-call chat box).
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      const next = !enabledRef.current;
      localParticipant.setMicrophoneEnabled(next);
      setFlash(next);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1100);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [localParticipant]);

  if (flash === null) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[115] flex justify-center">
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-2xl ${
          flash ? "bg-emerald-600" : "bg-rose-600"
        }`}
      >
        {flash ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        {flash ? "Mic on" : "Mic muted"}
      </div>
    </div>
  );
}

function DissolveConfirm({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </span>
          <div>
            <h3 className="font-black text-base leading-tight">
              End room for everyone?
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              All participants will be disconnected immediately and the room
              will close.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-bold py-2.5 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-2.5 transition disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ending…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                End room
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
