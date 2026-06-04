/**
 * Central site metadata used across SEO surfaces (metadata, sitemap,
 * structured data, manifest). Override the base URL via NEXT_PUBLIC_SITE_URL
 * in production / preview deployments.
 */
export const siteConfig = {
  name: "LeetRun",
  // Used in <title> templates and brand copy.
  title: "LeetRun - Gamified DSA & LeetCode Placement Prep",
  shortDescription:
    "Gamified DSA prep with curated sheets, interview patterns, deep LeetCode sync, adaptive quests, and an AI mentor that keeps you accountable.",
  description:
    "LeetRun is a gamified DSA placement platform with curated sheets (Blind 75, NeetCode 150, Striver's SDE & A2Z, Love Babbar 450, plus Google & Amazon company sets), interview patterns ranked by weightage, and deep LeetCode sync that imports your entire solve history. Get adaptive daily, weekly, and configurable revision quests, compete on smart leaderboards, share a public profile, and stay accountable with an AI mentor - perfect for cracking placements and tech interviews.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://leetrun.vercel.app").replace(
    /\/$/,
    ""
  ),
  ogImage: "/logo.png",
  creator: "LeetRun",
  email: "vishurizz0@gmail.com",
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
    "Blind 75",
    "NeetCode 150",
    "Striver SDE sheet",
    "Striver A2Z sheet",
    "Love Babbar 450",
    "DSA sheets",
    "coding interview patterns",
    "Google interview questions",
    "Amazon interview questions",
  ],
} as const;

export type SiteConfig = typeof siteConfig;
