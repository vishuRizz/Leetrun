"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle, PhoneOff } from "lucide-react";

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

      {/* Connecting state (no LiveKit yet) - full-screen unless minimized. */}
      {session && loading && (
        <div
          className={
            minimized
              ? "fixed bottom-4 right-3 z-[120] w-[300px] max-w-[calc(100vw-1.5rem)] rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-4 flex items-center gap-3"
              : "fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center"
          }
          style={
            minimized
              ? { bottom: "max(0.75rem, env(safe-area-inset-bottom))" }
              : undefined
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
              ? "fixed bottom-4 right-3 z-[120] w-[320px] max-w-[calc(100vw-1.5rem)] rounded-xl bg-zinc-950 border border-rose-900/50 shadow-2xl p-4 space-y-3"
              : "fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center"
          }
          style={
            minimized
              ? { bottom: "max(0.75rem, env(safe-area-inset-bottom))" }
              : undefined
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
