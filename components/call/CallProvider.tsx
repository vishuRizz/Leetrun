"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle, PhoneOff, PhoneCall, Video, X } from "lucide-react";

// The LiveKit-heavy call surface is loaded lazily and client-only so it never
// touches the server bundle and isn't shipped until a member starts a call.
const CallRoot = dynamic(() => import("./CallRoot"), { ssr: false });

export interface CallSession {
  roomId: string;
  lobbyName: string;
}

interface CallContextValue {
  session: CallSession | null;
  minimized: boolean;
  connected: boolean;
  /** Start (or re-focus) a lobby call. Safe to call when one is already open. */
  startCall: (session: CallSession) => void;
  /** Disconnect and tear down the active call. */
  endCall: () => void;
  minimize: () => void;
  maximize: () => void;
  /** True when there is a live call session for the given lobby id. */
  isActive: (roomId: string) => boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within a <CallProvider>.");
  }
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CallSession | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  // Guards against a stale token response landing after the user ended the call
  // or switched to another lobby's call.
  const reqRef = useRef(0);

  const reset = useCallback(() => {
    setSession(null);
    setMinimized(false);
    setToken(null);
    setServerUrl(null);
    setLoading(false);
    setConnected(false);
    setError("");
  }, []);

  const endCall = useCallback(() => {
    reqRef.current += 1; // invalidate any in-flight token fetch
    reset();
  }, [reset]);

  const connect = useCallback((next: CallSession) => {
    const reqId = reqRef.current + 1;
    reqRef.current = reqId;

    setSession(next);
    setMinimized(false);
    setToken(null);
    setServerUrl(null);
    setConnected(false);
    setError("");
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: next.roomId }),
        });
        const data = await res.json();
        if (reqRef.current !== reqId) return; // superseded
        if (!res.ok) throw new Error(data.error || "Couldn't join the call.");
        if (!data.token || !data.url) {
          throw new Error("The call server returned an invalid token.");
        }
        setToken(data.token);
        setServerUrl(data.url);
      } catch (e: any) {
        if (reqRef.current !== reqId) return;
        setError(e?.message || "Couldn't join the call.");
      } finally {
        if (reqRef.current === reqId) setLoading(false);
      }
    })();
  }, []);

  const startCall = useCallback(
    (next: CallSession) => {
      // Re-focusing a healthy call that's already open → just maximize it.
      if (
        session &&
        session.roomId === next.roomId &&
        token &&
        serverUrl &&
        !error
      ) {
        setMinimized(false);
        return;
      }
      connect(next);
    },
    [session, token, serverUrl, error, connect]
  );

  // ── "Ringing": detect calls starting in the user's other lobbies ──────────
  const [ringing, setRinging] = useState<{
    roomId: string;
    lobbyName: string;
    starter: string;
  } | null>(null);
  // Rooms we've already rung for, so each call only rings once until it ends.
  const notifiedRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sessionRoomRef = useRef<string | null>(null);
  sessionRoomRef.current = session?.roomId ?? null;

  const playRing = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctx());
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      // Two pleasant tones, repeated → a soft "ring-ring".
      const pattern = [880, 1174.66, 880, 1174.66];
      pattern.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t0 = now + i * 0.2 + (i >= 2 ? 0.15 : 0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.2);
      });
    } catch {
      /* audio not available / blocked — silent is fine */
    }
  }, []);

  // Poll for incoming calls app-wide (the provider lives in the main layout).
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch("/api/livekit/ringing");
        if (res.ok) {
          const data = await res.json();
          const calls: {
            roomId: string;
            lobbyName: string;
            count: number;
            starter?: string;
            participants: { identity: string; name: string }[];
          }[] = data.calls || [];

          const activeIds = new Set(calls.map((c) => c.roomId));
          // Forget calls that have ended so a fresh one can ring again.
          for (const id of Array.from(notifiedRef.current)) {
            if (!activeIds.has(id)) notifiedRef.current.delete(id);
          }

          for (const c of calls) {
            if (c.roomId === sessionRoomRef.current) continue; // I'm in it
            if (notifiedRef.current.has(c.roomId)) continue; // already rung
            notifiedRef.current.add(c.roomId);
            if (!cancelled) {
              setRinging({
                roomId: c.roomId,
                lobbyName: c.lobbyName,
                starter: c.participants[0]?.name || "Someone",
              });
              playRing();
            }
          }
        }
      } catch {
        /* ignore polling errors */
      } finally {
        if (!cancelled) timer = setTimeout(tick, 15000);
      }
    };

    // Small initial delay so it doesn't race page hydration.
    timer = setTimeout(tick, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playRing]);

  // Auto-dismiss the ringing toast after a while.
  useEffect(() => {
    if (!ringing) return;
    const t = setTimeout(() => setRinging(null), 15000);
    return () => clearTimeout(t);
  }, [ringing]);

  const minimize = useCallback(() => setMinimized(true), []);
  const maximize = useCallback(() => {
    // If a previous attempt errored, retry the connection on maximize.
    if (error && session) {
      connect(session);
      return;
    }
    setMinimized(false);
  }, [error, session, connect]);
  const isActive = useCallback(
    (roomId: string) => !!session && session.roomId === roomId,
    [session]
  );

  return (
    <CallContext.Provider
      value={{
        session,
        minimized,
        connected,
        startCall,
        endCall,
        minimize,
        maximize,
        isActive,
      }}
    >
      {children}

      {/* Incoming-call "ring" toast — bottom-left so it never collides with the
          mini player (bottom-right). Only shows for calls you're not in. */}
      {ringing && ringing.roomId !== session?.roomId && (
        <div className="fixed bottom-4 left-4 z-[130] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl bg-zinc-950 border border-emerald-500/40 shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start gap-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
              <PhoneCall className="relative w-4 h-4 text-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white leading-tight">
                {ringing.starter} started a call
              </p>
              <p className="text-xs text-zinc-400 truncate">
                in {ringing.lobbyName}
              </p>
            </div>
            <button
              onClick={() => setRinging(null)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                const r = ringing;
                setRinging(null);
                if (r) startCall({ roomId: r.roomId, lobbyName: r.lobbyName });
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
            >
              <Video className="w-3.5 h-3.5" />
              Join call
            </button>
            <button
              onClick={() => setRinging(null)}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
            >
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* Connecting state (no LiveKit yet) — full-screen unless minimized. */}
      {session && loading && (
        <div
          className={
            minimized
              ? "fixed bottom-4 right-4 z-[120] w-[300px] rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4 flex items-center gap-3"
              : "fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center gap-3"
          }
        >
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400 shrink-0" />
          <p className="text-sm font-medium text-zinc-300">
            Connecting to {session.lobbyName}…
          </p>
        </div>
      )}

      {/* Token / permission / connection error. */}
      {session && !loading && error && (
        <div
          className={
            minimized
              ? "fixed bottom-4 right-4 z-[120] w-[320px] rounded-xl bg-zinc-950 border border-rose-900/50 shadow-2xl p-4 space-y-3"
              : "fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center"
          }
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-bold text-white">Can&apos;t join the call</p>
          </div>
          <p className="text-xs text-zinc-400 max-w-sm">{error}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => session && connect(session)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
            >
              <Loader2 className="w-3.5 h-3.5" />
              Retry
            </button>
            <button
              onClick={endCall}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Live call surface. Stays mounted across route changes because the
          provider lives in the persistent app layout. */}
      {session && !loading && !error && token && serverUrl && (
        <CallRoot
          token={token}
          serverUrl={serverUrl}
          roomId={session.roomId}
          lobbyName={session.lobbyName}
          minimized={minimized}
          onMinimize={minimize}
          onMaximize={() => setMinimized(false)}
          onEnd={endCall}
          onConnected={() => setConnected(true)}
          onError={(msg) => {
            setConnected(false);
            setError(msg || "The call disconnected unexpectedly.");
          }}
        />
      )}
    </CallContext.Provider>
  );
}
