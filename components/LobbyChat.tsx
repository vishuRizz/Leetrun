"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, X, MessagesSquare, Phone } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

interface ChatMessage {
  id: string;
  content: string;
  source: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface LobbyChatProps {
  roomId: string;
  currentUserId: string | null;
  lobbyName: string;
  onClose: () => void;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function LobbyChat({
  roomId,
  currentUserId,
  lobbyName,
  onClose,
}: LobbyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const seenIds = useRef<Set<string>>(new Set());
  const lastCreatedAt = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const fresh = incoming.filter((m) => !seenIds.current.has(m.id));
      if (fresh.length === 0) return prev;
      for (const m of fresh) seenIds.current.add(m.id);
      const next = [...prev, ...fresh];
      const newest = next[next.length - 1];
      if (newest) lastCreatedAt.current = newest.createdAt;
      return next;
    });
  }, []);

  // Initial load: most recent page.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    seenIds.current = new Set();
    lastCreatedAt.current = null;
    setMessages([]);
    (async () => {
      try {
        const res = await fetch(`/api/room/messages?roomId=${roomId}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) mergeMessages(data.messages || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, mergeMessages]);

  // Incremental polling — fetches only messages newer than the last one.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!lastCreatedAt.current) return;
      try {
        const res = await fetch(
          `/api/room/messages?roomId=${roomId}&after=${encodeURIComponent(
            lastCreatedAt.current
          )}`
        );
        const data = await res.json();
        if (!cancelled && res.ok) mergeMessages(data.messages || []);
      } catch {
        /* ignore */
      }
    };
    const interval = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomId, mergeMessages]);

  // Keep pinned to the newest message unless the user has scrolled up.
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    atBottomRef.current = true;
    try {
      const res = await fetch("/api/room/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: text, source: "lobby" }),
      });
      const data = await res.json();
      if (res.ok && data.message) mergeMessages([data.message]);
      else setInput(text); // restore on failure
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] bg-card border-l border-border shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Lobby chat"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 className="font-black text-base text-foreground flex items-center gap-2">
              <MessagesSquare className="w-4 h-4 text-indigo-400" />
              Lobby chat
            </h2>
            <p className="text-[10.5px] text-muted-foreground truncate">
              {lobbyName} · messages persist across calls
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
              <MessagesSquare className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                No messages yet
              </p>
              <p className="text-xs text-muted-foreground">
                Say hi — this thread stays even after calls end.
              </p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.userId === currentUserId;
              const prev = messages[i - 1];
              const grouped = prev && prev.userId === m.userId;
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div className="w-7 shrink-0">
                    {!grouped && (
                      <UserAvatar
                        url={m.user.avatarUrl}
                        name={m.user.fullName}
                        email={m.user.email}
                        size={28}
                      />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] min-w-0 ${
                      isMe ? "items-end text-right" : "items-start"
                    } flex flex-col`}
                  >
                    {!grouped && (
                      <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                        {isMe
                          ? "You"
                          : m.user.fullName || m.user.email.split("@")[0]}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 px-1 inline-flex items-center gap-1">
                      {m.source === "call" && (
                        <Phone className="w-2.5 h-2.5" />
                      )}
                      {timeLabel(m.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={send}
          className="border-t border-border p-3 flex items-center gap-2 shrink-0"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the lobby…"
            maxLength={2000}
            className="flex-1 bg-background border border-border focus:border-indigo-500 rounded-full py-2 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shrink-0"
            title="Send"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </aside>
    </>
  );
}
