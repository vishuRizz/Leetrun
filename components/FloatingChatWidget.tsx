"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, User, Maximize2, Loader2, Volume2, Square } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Human-readable description of the page the user is on, for AI context. */
function describePage(pathname: string): string | undefined {
  if (pathname.startsWith("/sheets/")) {
    const slug = pathname.split("/")[2]?.replace(/-/g, " ");
    return slug ? `Viewing the "${slug}" DSA sheet.` : "Browsing a DSA sheet.";
  }
  if (pathname.startsWith("/sheets")) return "Browsing the DSA sheets list.";
  if (pathname.startsWith("/patterns")) return "On the Patterns page (interview pattern families).";
  if (pathname.startsWith("/analytics")) return "Looking at their Analytics dashboard.";
  if (pathname.startsWith("/profile")) return "On their Profile page.";
  if (pathname.startsWith("/prep")) return "On the Roadmap (study plan + flashcards).";
  if (pathname.startsWith("/notes")) return "Reading the System Design notes.";
  if (pathname.startsWith("/leaderboard")) return "On the Leaderboard.";
  if (pathname.startsWith("/rooms")) return "In a competitive Lobby.";
  if (pathname.startsWith("/dashboard")) return "On their Dashboard.";
  return undefined;
}

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [mentorName, setMentorName] = useState("Sensei");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentPlayIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Load initial chat history if opening for first time
      if (messages.length === 0) {
        loadConversation();
      }
    }
  }, [isOpen, messages]);

  const loadConversation = async () => {
    try {
      const res = await fetch("/api/ai/chat");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMentorName(data.mentorName);
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([{
              id: "g1",
              role: "assistant",
              content:
                data.greeting ||
                JSON.stringify({
                  reply: `Hey! I am ${data.mentorName}, your AI coach. How can I help you right now?`,
                  suggestions: ["Help me with a DSA problem", "Review my progress"],
                }),
            }]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, pageContext: describePage(pathname) }),
      });
      const data = await res.json();

      if (res.ok) {
        const assistantMsg: Message = {
          id: Math.random().toString(),
          role: "assistant",
          content: data.response, // This will be the JSON string from the API
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [...prev, { id: Math.random().toString(), role: "assistant", content: "Error connecting to mentor." }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: Math.random().toString(), role: "assistant", content: "Communication error." }]);
    } finally {
      setSending(false);
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

  const parseMessage = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.reply) return parsed;
      return { reply: content, suggestions: [] };
    } catch (e) {
      return { reply: content, suggestions: [] };
    }
  };

  // Hide widget on the dedicated chat page and on the standalone /fun-room
  // video rooms (which are a separate, just-for-fun experience).
  if (pathname === "/chat" || pathname === "/fun-room" || pathname.startsWith("/fun-room/")) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <Card className="w-80 sm:w-96 h-[500px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                {mentorName[0]}
              </div>
              <div>
                <CardTitle className="text-sm">{mentorName}</CardTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  AI Coach
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/chat")} title="Open full chat">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const { reply, suggestions } = msg.role === "assistant" ? parseMessage(msg.content) : { reply: msg.content, suggestions: [] };
              return (
                <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground flex-shrink-0 mt-1">
                      {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
                      }`}>
                        {reply}
                      </div>
                      {msg.role === "assistant" && reply && (
                        <button
                          onClick={() => playAudio(reply, msg.id)}
                          className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors ml-1"
                        >
                          {playingId === msg.id ? (
                            <><Square className="w-3 h-3 fill-current" /> Stop</>
                          ) : (
                            <><Volume2 className="w-3 h-3" /> Play</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {msg.role === "assistant" && suggestions && suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-8">
                      {suggestions.map((sug: string, i: number) => (
                        <Button 
                          key={i} 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-auto py-1.5 px-3 bg-background border-border"
                          onClick={() => handleSendMessage(sug)}
                        >
                          {sug}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {sending && (
              <div className="flex gap-2 items-start max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground flex-shrink-0 mt-1 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-muted rounded-2xl rounded-tl-sm text-sm flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-muted-foreground text-xs">Typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>
          
          <CardFooter className="p-3 border-t bg-background">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex gap-2 w-full"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={sending}
                placeholder="Ask me anything..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={sending || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Button 
          onClick={() => setIsOpen(true)} 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
