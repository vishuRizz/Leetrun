"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  external?: boolean;
}

/**
 * Friendly, reusable empty-state with an icon, copy, and one or two CTAs.
 * Used across cached pages (leaderboard, analytics, sheets) so a blank screen
 * always nudges the user toward a productive next step.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
}) {
  const cls = (variant: EmptyStateAction["variant"]) =>
    variant === "secondary"
      ? "border border-border hover:bg-muted text-foreground"
      : "bg-indigo-600 hover:bg-indigo-500 text-white";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-indigo-500" />
      </div>
      <h3 className="font-bold text-base text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
          {actions.map((a) => {
            const base = `px-5 py-2.5 rounded-xl text-sm font-bold transition ${cls(
              a.variant
            )}`;
            if (a.href) {
              return a.external ? (
                <a
                  key={a.label}
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  className={base}
                >
                  {a.label}
                </a>
              ) : (
                <Link key={a.label} href={a.href} className={base}>
                  {a.label}
                </Link>
              );
            }
            return (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={base}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
