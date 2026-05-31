"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Bot,
  User,
  Zap,
  Volume2,
  Square
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mentorName, setMentorName] = useState("Sensei");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayIdRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/ai/chat");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMentorName(data.mentorName);
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            const initialGreeting: Message = {
              id: "g1",
              role: "assistant",
              content: JSON.stringify({
                reply: `Hey! I am ${data.mentorName || "Sensei"}, your AI coach. How is your DSA preparation going?`,
                suggestions: ["Roast my streak!", "Check my weak topics", "Recommend a problem"]
              }),
              createdAt: new Date().toISOString(),
            };
            setMessages([initialGreeting]);
          }
        }
      } else {
        const fallbackName = user.user_metadata?.mentorName || "Sensei";
        setMentorName(fallbackName);
        const initialGreeting: Message = {
          id: "g1",
          role: "assistant",
          content: JSON.stringify({
            reply: `Hey! I am ${fallbackName}, your AI coach. How is your DSA preparation going?`,
            suggestions: ["Roast my streak!", "Check my weak topics", "Recommend a problem"]
          }),
          createdAt: new Date().toISOString(),
        };
        setMessages([initialGreeting]);
      }
    } catch (err) {
      setError("Failed to load conversation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversation();
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (res.ok) {
        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: "assistant",
          content: data.response,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError(data.error || "Failed to receive mentor feedback.");
      }
    } catch (err) {
      setError("Communication error. Please check connection.");
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const parseMessage = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.reply) return parsed;
      return { reply: content, suggestions: [] };
    } catch (e) {
      return { reply: content, suggestions: [] };
    }
  };

  const playAudio = async (text: string, messageId: string) => {
    if (playingId === messageId) {
      audioRef.current?.pause();
      setPlayingId(null);
      currentPlayIdRef.current = null;
      return;
    }

    setPlayingId(messageId);
    currentPlayIdRef.current = messageId;
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        if (currentPlayIdRef.current !== messageId) return; // Prevent race condition
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => {
          if (currentPlayIdRef.current === messageId) {
            setPlayingId(null);
            currentPlayIdRef.current = null;
          }
        };
        await audioRef.current.play();
      } else {
        if (currentPlayIdRef.current === messageId) setPlayingId(null);
      }
    } catch (e) {
      console.error(e);
      if (currentPlayIdRef.current === messageId) setPlayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
        <p className="text-muted-foreground text-sm">Opening secure chat channel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen transition-colors duration-150">
      {/* Navbar Header */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 text-muted-foreground hover:text-foreground bg-muted/50 border border-border rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shadow-lg">
              {mentorName[0]}
            </div>
            <div>
              <h1 className="font-bold text-sm text-foreground">{mentorName}</h1>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                DSA Mentor
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="hidden sm:inline font-bold text-xs tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            CODERUN AI
          </span>
        </div>
      </nav>

      {/* Chat Messages viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            const { reply, suggestions } = msg.role === "assistant" ? parseMessage(msg.content) : { reply: msg.content, suggestions: [] };
            
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" 
                      ? "bg-secondary text-secondary-foreground border border-border" 
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4.5 h-4.5" />}
                  </div>

                  <div className="flex flex-col gap-1.5 items-start">
                    <div
                      className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-md"
                          : "bg-muted border border-border text-foreground rounded-tl-none"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{reply}</div>
                    </div>
                    {msg.role === "assistant" && reply && (
                      <button
                        onClick={() => playAudio(reply, msg.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors ml-2"
                      >
                        {playingId === msg.id ? (
                          <><Square className="w-3.5 h-3.5 fill-current" /> Stop Audio</>
                        ) : (
                          <><Volume2 className="w-3.5 h-3.5" /> Play Audio</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === "assistant" && suggestions && suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-12">
                    {suggestions.map((sug: string, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => handleSendMessage(sug)}
                        className="text-xs py-1.5 px-3 bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 flex-shrink-0 animate-pulse">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="p-4 bg-muted border border-border text-muted-foreground rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>{mentorName} is formulating dynamic feedback...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/20 text-red-400 text-xs rounded-xl text-center">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Interactive Bottom Box */}
      <div className="border-t border-border p-4 bg-background/80 backdrop-blur-md flex-shrink-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Quick suggestions bubbles */}
          {messages.length === 1 && !sending && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {[
                "Roast my active streak!",
                "Check my weak topics",
                "Recommend an DP problem",
                "Give me a motivation roast!",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  type="button"
                  className="flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-secondary border border-border rounded-full text-xs font-semibold text-muted-foreground transition"
                >
                  <Zap className="w-3 h-3 text-primary fill-current" /> {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Form message sender */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={sending}
              placeholder={`Send message to ${mentorName}...`}
              className="flex-1 bg-background border border-border focus:border-primary rounded-xl py-3 px-4 text-sm text-foreground placeholder-muted-foreground outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !inputValue.trim()}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground p-3 rounded-xl transition flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
