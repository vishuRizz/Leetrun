"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { clearClientCache } from "@/lib/cache/clientCache";
import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  CalendarClock,
  CornerDownLeft,
  Home,
  Layers,
  LogIn,
  LogOut,
  Moon,
  Network,
  Search,
  Sun,
  Swords,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export const OPEN_COMMAND_EVENT = "leetrun:open-command";

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: LucideIcon;
  perform: () => void;
}

interface CmdSection {
  title: string;
  items: CmdItem[];
}

export default function CommandPalette({
  sheets = [],
}: {
  sheets?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [isGuest, setIsGuest] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (alive) setIsGuest(!user);
      } catch {
        /* noop */
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const signOut = useCallback(async () => {
    close();
    clearClientCache();
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* continue */
    }
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* ignore */
    }
    window.location.href = "/login";
  }, [close, supabase]);

  // Global open shortcut (Cmd/Ctrl+K) + custom event from the sidebar button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      // Focus the input on the next tick once the overlay is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const sections: CmdSection[] = useMemo(() => {
    const nav: CmdItem[] = [
      { id: "nav-dashboard", label: "Dashboard", icon: Home, keywords: "home overview", perform: () => go("/dashboard") },
      { id: "nav-analytics", label: "Analytics", icon: BarChart3, keywords: "stats insights topics", perform: () => go("/analytics") },
      { id: "nav-leaderboard", label: "Leaderboard", icon: Trophy, keywords: "ranking rank compete", perform: () => go("/leaderboard") },
      { id: "nav-sheets", label: "Sheets", icon: Layers, keywords: "problems dsa neetcode striver blind", perform: () => go("/sheets") },
      { id: "nav-patterns", label: "Patterns", icon: Network, keywords: "techniques sliding window", perform: () => go("/patterns") },
      { id: "nav-study-plan", label: "Study Plan", icon: CalendarClock, keywords: "interview date schedule plan prep countdown", perform: () => go("/study-plan") },
      { id: "nav-quests", label: "Side Quests", icon: Swords, keywords: "challenges daily", perform: () => go("/side-quests") },
      { id: "nav-rooms", label: "Lobbies", icon: Users, keywords: "rooms group compete friends", perform: () => go("/rooms") },
      { id: "nav-notes", label: "System Design", icon: BookOpen, keywords: "notes learn", perform: () => go("/notes") },
      { id: "nav-flashcards", label: "Flashcards", icon: Brain, keywords: "revision cards complexity patterns memorize", perform: () => go("/flashcards") },
      { id: "nav-profile", label: "Profile", icon: User, keywords: "account me settings", perform: () => go("/profile") },
      { id: "nav-chat", label: "AI Coach", icon: Bot, keywords: "mentor assistant", perform: () => go("/chat") },
    ];

    const sheetItems: CmdItem[] = sheets.map((s) => ({
      id: `sheet-${s.slug}`,
      label: s.name,
      hint: "Sheet",
      icon: Layers,
      keywords: `sheet ${s.slug}`,
      perform: () => go(`/sheets/${s.slug}`),
    }));

    const isDark = theme === "dark";
    const actions: CmdItem[] = [
      {
        id: "act-theme",
        label: isDark ? "Switch to light mode" : "Switch to dark mode",
        icon: isDark ? Sun : Moon,
        keywords: "theme dark light appearance toggle",
        perform: () => {
          setTheme(isDark ? "light" : "dark");
          close();
        },
      },
      isGuest
        ? {
            id: "act-login",
            label: "Log in",
            icon: LogIn,
            keywords: "signin sign in account",
            perform: () => go("/login"),
          }
        : {
            id: "act-logout",
            label: "Log out",
            icon: LogOut,
            keywords: "signout sign out leave",
            perform: () => void signOut(),
          },
    ];

    return [
      { title: "Navigation", items: nav },
      { title: "Sheets", items: sheetItems },
      { title: "Actions", items: actions },
    ];
  }, [sheets, theme, isGuest, go, setTheme, close, signOut]);

  const filtered: CmdSection[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((sec) => ({
        title: sec.title,
        items: sec.items.filter((it) =>
          `${it.label} ${it.keywords || ""}`.toLowerCase().includes(q)
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [query, sections]);

  const flat = useMemo(() => filtered.flatMap((s) => s.items), [filtered]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[active]?.perform();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={close}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search pages, sheets, actions..."
            className="flex-1 bg-transparent py-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((sec) => (
              <div key={sec.title} className="px-2 pb-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  {sec.title}
                </div>
                {sec.items.map((it) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === active;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      data-cmd-index={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => it.perform()}
                      className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition ${
                        isActive
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-sm font-medium truncate">
                        {it.label}
                      </span>
                      {it.hint && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {it.hint}
                        </span>
                      )}
                      {isActive && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
