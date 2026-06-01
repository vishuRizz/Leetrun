"use client";

import Image from "next/image";
import React from "react";

type Props = {
  url?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
  /** Optional override for the initial text. */
  initial?: string;
  rounded?: "full" | "lg" | "md";
};

/**
 * Compact, consistent avatar primitive used across leaderboards / member lists.
 * Renders the user's uploaded image when available, otherwise falls back to
 * an initial-letter chip themed with the app's indigo accent.
 */
export function UserAvatar({
  url,
  name,
  email,
  size = 32,
  className = "",
  initial,
  rounded = "full",
}: Props) {
  const radius =
    rounded === "lg" ? "rounded-xl" : rounded === "md" ? "rounded-md" : "rounded-full";

  const fallbackChar =
    initial?.[0]?.toUpperCase() ||
    (name?.trim()?.[0] || email?.[0] || "?").toUpperCase();

  const fontSize = Math.max(10, Math.floor(size * 0.42));

  if (url) {
    return (
      <div
        className={`relative overflow-hidden border border-border bg-muted ${radius} ${className}`}
        style={{ width: size, height: size }}
      >
        {/* `unoptimized` keeps things working even if the Supabase host hasn't
         * been allow-listed yet; the URLs are already public + cached. */}
        <Image
          src={url}
          alt={name || email || "User avatar"}
          width={size}
          height={size}
          unoptimized
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-bold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30 ${radius} ${className}`}
      style={{ width: size, height: size, fontSize }}
      aria-label={name || email || "User"}
    >
      {fallbackChar}
    </div>
  );
}

export default UserAvatar;
