"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Logo from "./Logo";
import {
  BarChart3,
  Bot,
  Home,
  LogOut,
  Swords,
  Trophy,
  User,
  Users,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { createClient } from "@/lib/supabase/client";

interface JoinedRoom {
  id: string;
  name: string;
  roomCode: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [joinedLobbies, setJoinedLobbies] = useState<JoinedRoom[]>([]);

  // Fetch the user's joined lobbies once on mount so we can show shortcuts
  // in the sidebar. Errors are silently swallowed — if the call fails the
  // section just renders empty, which is acceptable for a nav affordance.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/room/list");
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data?.rooms)) {
          setJoinedLobbies(
            data.rooms.map((r: any) => ({
              id: r.id,
              name: r.name,
              roomCode: r.roomCode,
            }))
          );
        }
      } catch {
        /* noop */
      }
    })();
    return () => {
      active = false;
    };
    // Re-fetch whenever the user navigates to /rooms so the list stays
    // in sync after create/leave/join actions there.
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Lobbies", href: "/rooms", icon: Users },
    { name: "Side Quests", href: "/side-quests", icon: Swords },
    { name: "Profile", href: "/profile", icon: User },
    { name: "AI Coach", href: "/chat", icon: Bot },
  ];

  // The currently-open lobby (if we're on /rooms?roomId=...), used to
  // highlight the matching entry below.
  const activeRoomIdInUrl =
    pathname.startsWith("/rooms") ? searchParams.get("roomId") : null;

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 w-16 hover:w-64 group overflow-hidden whitespace-nowrap shadow-lg shadow-black/5">
      {/* Top Logo Section */}
      <div className="h-16 flex items-center px-4 border-b border-border/50 shrink-0">
        <Logo width={28} height={28} className="shrink-0" />
        <span className="font-heading font-black text-base tracking-wider text-foreground ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          LeetRun
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors shrink-0 ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
              }`}
              title={item.name}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm">
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Joined lobbies — quick shortcuts to jump into any room.
           When the sidebar is collapsed only initial-letter chips are
           visible; on hover the room name + code expand. */}
        {joinedLobbies.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-0.5">
            <div
              className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 truncate"
              aria-hidden="true"
            >
              Lobbies
            </div>
            {joinedLobbies.map((room) => {
              const href = `/rooms?roomId=${room.id}`;
              const isActive = activeRoomIdInUrl === room.id;
              const initial = (room.name || room.roomCode || "?")
                .trim()
                .charAt(0)
                .toUpperCase();
              return (
                <Link
                  key={room.id}
                  href={href}
                  title={`${room.name} · ${room.roomCode}`}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors shrink-0 ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[10px] font-black font-mono ${
                      isActive
                        ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {initial}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[12px] min-w-0 flex-1 flex flex-col leading-tight">
                    <span className="truncate font-medium">{room.name}</span>
                    <span className="truncate font-mono text-[9.5px] text-muted-foreground/80">
                      #{room.roomCode}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border/50 flex flex-col gap-2 shrink-0">
        <div
          className="flex items-center gap-3 px-2 py-2.5 rounded-lg shrink-0 text-muted-foreground"
          title="Toggle Theme"
        >
          <div className="shrink-0 -ml-1">
            <ThemeToggle />
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium">
            Theme
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-2 py-2.5 rounded-lg shrink-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full text-left"
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-bold">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
