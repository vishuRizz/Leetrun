"use client";

import React, { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

let initialized = false;

/**
 * Initializes PostHog on the client, identifies the signed-in user, and tracks
 * SPA pageviews on route changes. Renders children unchanged and silently
 * does nothing when NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ready = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    if (!initialized) {
      posthog.init(key, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: false, // tracked manually on route change below
        capture_pageleave: true,
        person_profiles: "identified_only",
        defaults: "2025-05-24",
      });
      initialized = true;
    }
    ready.current = true;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          posthog.identify(user.id, { email: user.email });
        }
      } catch {
        /* identify is best-effort */
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);

  return <>{children}</>;
}
