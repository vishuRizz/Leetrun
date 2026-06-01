"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  Home,
  LogOut,
  Trophy,
  User,
  Users,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { createClient } from "@/lib/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Lobbies", href: "/rooms", icon: Users },
    { name: "Profile", href: "/profile", icon: User },
    { name: "AI Coach", href: "/chat", icon: Bot },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 w-16 hover:w-64 group overflow-hidden whitespace-nowrap shadow-lg shadow-black/5">
      {/* Top Logo Section */}
      <div className="h-16 flex items-center px-4 border-b border-border/50 shrink-0">
        <Image
          src="/logo.png"
          alt="LeetRun"
          width={28}
          height={28}
          className="object-contain shrink-0"
        />
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
