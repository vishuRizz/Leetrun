"use client";

import Image from "next/image";
import React from "react";

type Props = {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  /**
   * Force a single variant when the surrounding surface is always one tone
   * (e.g. an always-dark footer or always-light card). When omitted, the
   * logo flips automatically based on the `dark` theme class on `<html>`.
   */
  variant?: "auto" | "light" | "dark";
};

/**
 * App logo with automatic light/dark variants.
 *
 * - `auto` (default): white-on-black `logo-black.png` shows on dark surfaces
 *   (via `dark:` variant), `logo.png` shows otherwise.
 * - `light`: always use the standard logo (good on light/white backgrounds).
 * - `dark`: always use the white-on-black logo (good on always-dark surfaces
 *   like the landing navbar pill or footer).
 */
export function Logo({
  width = 24,
  height = 24,
  className = "",
  alt = "LeetRun",
  variant = "auto",
}: Props) {
  if (variant === "light") {
    return (
      <Image
        src="/logo.png"
        alt={alt}
        width={width}
        height={height}
        className={`object-contain ${className}`}
      />
    );
  }

  if (variant === "dark") {
    return (
      <Image
        src="/logo-black.png"
        alt={alt}
        width={width}
        height={height}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={width}
        height={height}
        className="object-contain block dark:hidden"
      />
      <Image
        src="/logo-black.png"
        alt={alt}
        width={width}
        height={height}
        className="object-contain hidden dark:block"
      />
    </span>
  );
}

export default Logo;
