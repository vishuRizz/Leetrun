"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Video,
  MessageSquareText,
  PhoneCall,
  Volume2,
  VolumeX,
  CheckCheck,
} from "lucide-react";
import { useCall } from "@/components/call/CallProvider";

interface FeedItem {
  key: string;
  kind: "message" | "call";
  roomId: string;
  lobbyName: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
}

interface PollMessage {
  id: string;
  roomId: string;
  lobbyName: string;
  sender: string;
  preview: string;
  createdAt: string;
}
interface PollCall {
  roomId: string;
  lobbyName: string;
  count: number;
  participants: { identity: string; name: string }[];
}

const MUTE_KEY = "leetrun:notif-muted";
const POLL_MS = 8000;

function relTime(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationCenter() {
  const router = useRouter();
  const call = useCall();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [toasts, setToasts] = useState<FeedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  const sinceRef = useRef<string | null>(null);
  const seenMsg = useRef<Set<string>>(new Set());
  const notifiedCalls = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const sessionRoomRef = useRef<string | null>(null);
  sessionRoomRef.current = call.session?.roomId ?? null;

  // Mute preference (persisted).
  useEffect(() => {
    try {
      const v = localStorage.getItem(MUTE_KEY) === "1";
      setMuted(v);
      mutedRef.current = v;
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const ensureCtx = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctx());
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Browsers block audio until a user gesture - unlock on first interaction.
  useEffect(() => {
    const unlock = () => ensureCtx();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [ensureCtx]);

  const playTone = useCallback(
    (pattern: { f: number; t: number; d: number }[]) => {
      if (mutedRef.current) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const { f, t, d } of pattern) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        const t0 = now + t;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.13, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + d + 0.02);
      }
    },
    [ensureCtx]
  );

  // A soft rising chime for messages.
  const playPing = useCallback(
    () => playTone([{ f: 740, t: 0, d: 0.18 }, { f: 988, t: 0.11, d: 0.22 }]),
    [playTone]
  );
  // A two-tone "ring-ring" for calls.
  const playRing = useCallback(
    () =>
      playTone([
        { f: 880, t: 0, d: 0.18 },
        { f: 1174.66, t: 0.2, d: 0.18 },
        { f: 880, t: 0.55, d: 0.18 },
        { f: 1174.66, t: 0.75, d: 0.18 },
      ]),
    [playTone]
  );

  const pushItems = useCallback((items: FeedItem[]) => {
    if (items.length === 0) return;
    setFeed((prev) => [...items, ...prev].slice(0, 40));
    setToasts((prev) => [...items, ...prev].slice(0, 3));
    for (const it of items) {
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.key !== it.key)),
        6500
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const q = sinceRef.current
          ? `?since=${encodeURIComponent(sinceRef.current)}`
          : "";
        const res = await fetch(`/api/notifications/poll${q}`);
        if (res.ok) {
          const data = await res.json();
          const newItems: FeedItem[] = [];
          let sawMsg = false;
          let sawCall = false;

          for (const m of (data.messages || []) as PollMessage[]) {
            if (seenMsg.current.has(m.id)) continue;
            seenMsg.current.add(m.id);
            newItems.push({
              key: `m-${m.id}`,
              kind: "message",
              roomId: m.roomId,
              lobbyName: m.lobbyName,
              title: `${m.sender} · ${m.lobbyName}`,
              body: m.preview,
              ts: Date.parse(m.createdAt) || Date.now(),
              read: false,
            });
            sawMsg = true;
          }

          const calls = (data.calls || []) as PollCall[];
          const activeIds = new Set(calls.map((c) => c.roomId));
          for (const id of Array.from(notifiedCalls.current)) {
            if (!activeIds.has(id)) notifiedCalls.current.delete(id);
          }
          for (const c of calls) {
            if (c.roomId === sessionRoomRef.current) continue; // I'm in it
            if (notifiedCalls.current.has(c.roomId)) continue;
            notifiedCalls.current.add(c.roomId);
            const starter = c.participants[0]?.name || "Someone";
            newItems.push({
              key: `c-${c.roomId}-${Date.now()}`,
              kind: "call",
              roomId: c.roomId,
              lobbyName: c.lobbyName,
              title: `Live call · ${c.lobbyName}`,
              body: `${starter} is in the call · ${c.count} joined`,
              ts: Date.now(),
              read: false,
            });
            sawCall = true;
          }

          if (!cancelled && newItems.length) {
            pushItems(newItems);
            if (sawCall) playRing();
            else if (sawMsg) playPing();
          }
          if (data.now) sinceRef.current = data.now;
        }
      } catch {
        /* ignore poll errors */
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };

    timer = setTimeout(tick, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pushItems, playPing, playRing]);

  const unread = feed.reduce((n, f) => n + (f.read ? 0 : 1), 0);
  const markAllRead = () =>
    setFeed((prev) => prev.map((f) => ({ ...f, read: true })));

  const openItem = (it: FeedItem) => {
    setToasts((prev) => prev.filter((t) => t.key !== it.key));
    if (it.kind === "call") {
      call.startCall({ roomId: it.roomId, lobbyName: it.lobbyName });
    } else {
      router.push(`/rooms?roomId=${it.roomId}`);
    }
    setOpen(false);
    setFeed((prev) =>
      prev.map((f) => (f.key === it.key ? { ...f, read: true } : f))
    );
  };

  const toggleOpen = () => {
    setOpen((o) => {
      const next = !o;
      if (next) markAllRead();
      return next;
    });
  };

  return (
    <>
      {/* Bell - positioned by TopRightActionsProvider; below call overlays (z-110+). */}
      <div className="relative">
        <button
          onClick={toggleOpen}
          aria-label="Notifications"
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-muted transition"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-[59]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute top-12 right-0 z-[61] w-[340px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-black text-sm text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  Notifications
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleMute}
                    title={muted ? "Unmute sounds" : "Mute sounds"}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  >
                    {muted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {feed.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      You&apos;re all caught up
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lobby messages and calls show up here.
                    </p>
                  </div>
                ) : (
                  feed.map((it) => (
                    <button
                      key={it.key}
                      onClick={() => openItem(it)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/60 hover:bg-muted/60 transition ${
                        it.read ? "" : "bg-indigo-500/[0.06]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                          it.kind === "call"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-indigo-500/15 text-indigo-500"
                        }`}
                      >
                        {it.kind === "call" ? (
                          <PhoneCall className="w-4 h-4" />
                        ) : (
                          <MessageSquareText className="w-4 h-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {it.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {it.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {relTime(it.ts)}
                        </p>
                      </div>
                      {it.kind === "call" && (
                        <span className="shrink-0 self-center inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                          <Video className="w-3 h-3" /> Join
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transient toasts - top-right, below the bell. */}
      <div className="fixed top-16 right-3 z-[60] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-1.5rem)] pointer-events-none">
        {toasts.map((it) => (
          <div
            key={it.key}
            className={`pointer-events-auto rounded-xl bg-zinc-950 shadow-2xl p-3.5 animate-in fade-in slide-in-from-right-2 duration-200 border ${
              it.kind === "call"
                ? "border-emerald-500/40"
                : "border-indigo-500/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  it.kind === "call"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-indigo-500/15 text-indigo-400"
                }`}
              >
                {it.kind === "call" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/30" />
                )}
                {it.kind === "call" ? (
                  <PhoneCall className="relative w-4 h-4" />
                ) : (
                  <MessageSquareText className="relative w-4 h-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white leading-tight truncate">
                  {it.title}
                </p>
                <p className="text-xs text-zinc-400 line-clamp-2">{it.body}</p>
              </div>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.key !== it.key))
                }
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => openItem(it)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition ${
                  it.kind === "call"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {it.kind === "call" ? (
                  <>
                    <Video className="w-3.5 h-3.5" /> Join call
                  </>
                ) : (
                  <>
                    <MessageSquareText className="w-3.5 h-3.5" /> Open chat
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
