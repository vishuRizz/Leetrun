/**
 * Central site metadata used across SEO surfaces (metadata, sitemap,
 * structured data, manifest). Override the base URL via NEXT_PUBLIC_SITE_URL
 * in production / preview deployments.
 */
export const siteConfig = {
  name: "LeetRun",
  // Used in <title> templates and brand copy.
  title: "LeetRun — Gamified DSA & LeetCode Placement Prep",
  shortDescription:
    "Gamified DSA preparation that syncs with LeetCode, generates personalized daily quests, and keeps you accountable with an AI mentor.",
  description:
    "LeetRun is a gamified DSA preparation platform that syncs with your LeetCode profile and generates daily, weekly, and revision challenges personalized to your skill level and target company. Compete with friends in real-time coding rooms, climb XP leaderboards, and get an AI mentor that tracks your weak topics and keeps you accountable — perfect for cracking placement and tech interviews.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://leetrun.vercel.app").replace(
    /\/$/,
    ""
  ),
  ogImage: "/logo.png",
  creator: "LeetRun",
  email: "support@leetrun.vercel.app",
  twitter: "@leetrun",
  keywords: [
    "LeetRun",
    "leetrun",
    "DSA preparation",
    "LeetCode tracker",
    "LeetCode progress tracker",
    "data structures and algorithms practice",
    "placement preparation",
    "coding interview preparation",
    "gamified coding practice",
    "AI coding mentor",
    "DSA daily challenge",
    "competitive programming",
    "coding leaderboard",
    "multiplayer coding rooms",
    "tech interview prep",
    "LeetCode XP",
    "FAANG interview preparation",
  ],
} as const;

export type SiteConfig = typeof siteConfig;
