"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Send,
  X,
  MessagesSquare,
  Phone,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

interface ChatMessage {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaName: string | null;
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

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

function MessageMedia({
  url,
  type,
  name,
  isMe,
}: {
  url: string;
  type: string | null;
  name: string | null;
  isMe: boolean;
}) {
  const kind = type || "";
  if (kind.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name || "image"}
          className="rounded-xl max-w-[220px] max-h-[260px] object-cover border border-border"
        />
      </a>
    );
  }
  if (kind.startsWith("video/")) {
    return (
      <video
        src={url}
        controls
        className="rounded-xl max-w-[240px] max-h-[280px] border border-border bg-black"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name || true}
      className={`inline-flex items-center gap-2 max-w-[230px] rounded-xl px-3 py-2 border transition ${
        isMe
          ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
          : "bg-muted border-border text-foreground hover:bg-muted/70"
      }`}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="text-xs truncate flex-1">{name || "Attachment"}</span>
      <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
    </a>
  );
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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Incremental polling - fetches only messages newer than the last one.
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

  const pickFile = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("File must be smaller than 15 MB.");
      return;
    }
    setAttachment(file);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !attachment) || sending) return;
    setSending(true);
    setUploadError(null);
    const file = attachment;
    atBottomRef.current = true;
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("roomId", roomId);
        fd.append("content", text);
        fd.append("source", "lobby");
        res = await fetch("/api/room/messages/media", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/room/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, content: text, source: "lobby" }),
        });
      }
      const data = await res.json();
      if (res.ok && data.message) {
        mergeMessages([data.message]);
        setInput("");
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setUploadError(data.error || "Failed to send.");
      }
    } catch {
      setUploadError("Failed to send. Try again.");
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
        <header
          className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
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
                Say hi - this thread stays even after calls end.
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
                    {m.mediaUrl && (
                      <MessageMedia
                        url={m.mediaUrl}
                        type={m.mediaType}
                        name={m.mediaName}
                        isMe={isMe}
                      />
                    )}
                    {m.content && (
                      <div
                        className={`rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap ${
                          m.mediaUrl ? "mt-1 " : ""
                        }${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        {m.content}
                      </div>
                    )}
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

        <div
          className="border-t border-border p-3 shrink-0 space-y-2"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {attachment && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-2.5 py-1.5">
              {attachment.type.startsWith("image/") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={URL.createObjectURL(attachment)}
                  alt="preview"
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className="text-xs text-foreground truncate flex-1">
                {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {uploadError && (
            <p className="text-[11px] text-red-500 px-1">{uploadError}</p>
          )}
          <form onSubmit={send} className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted/70 border border-border text-muted-foreground hover:text-foreground transition shrink-0 disabled:opacity-50"
              title="Attach image, video or PDF"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the lobby…"
              maxLength={2000}
              className="flex-1 bg-background border border-border focus:border-indigo-500 rounded-full py-2 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !attachment)}
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
        </div>
      </aside>
    </>
  );
}
