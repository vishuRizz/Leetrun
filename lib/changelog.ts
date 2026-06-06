/**
 * Public changelog ("What's new"). Add the newest entry to the TOP of the
 * array. Keep items short and user-facing. Tags: "new" | "improved" | "fixed".
 */
export type ChangeTag = "new" | "improved" | "fixed";

export interface ChangelogItem {
  tag: ChangeTag;
  text: string;
}

export interface ChangelogEntry {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Short headline for this release. */
  title: string;
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-06-07",
    title: "Invite friends, earn coins",
    items: [
      { tag: "new", text: "Invite & Earn: share your link and you both get 50 coins when a friend joins and finishes onboarding." },
    ],
  },
  {
    date: "2026-06-05",
    title: "Smarter mentor, real streaks & account controls",
    items: [
      { tag: "new", text: "AI mentor now grounds answers in your real solve data, sheets, patterns, and System Design notes - and opens with a personalized recap." },
      { tag: "new", text: "Settings page: manage your profile, email/password, notifications, export your data, or delete your account." },
      { tag: "new", text: "Privacy Policy and Terms of Service pages." },
      { tag: "new", text: "Give feedback or report a bug from anywhere via the sidebar or ⌘K." },
      { tag: "improved", text: "Your streak now reflects real LeetCode activity, not just in-app quests." },
      { tag: "improved", text: "Sheets remember the last step you were working on and reopen it automatically." },
      { tag: "fixed", text: "Analytics refresh now triggers a real LeetCode sync." },
    ],
  },
  {
    date: "2026-05-20",
    title: "Prep Kit, study plans & solve timing",
    items: [
      { tag: "new", text: "Prep Kit: a date-bound study plan generator plus concept flashcards." },
      { tag: "new", text: "Solve timer on sheet problems with speed analytics by difficulty." },
      { tag: "new", text: "Per-question notes across sheets, recommendations, and submissions." },
      { tag: "improved", text: "Auto deep-sync keeps your LeetCode profile fresh in the background." },
    ],
  },
  {
    date: "2026-05-02",
    title: "Deeper analytics & a global command palette",
    items: [
      { tag: "new", text: "Topic heatmap with targeted problem recommendations for your weak areas." },
      { tag: "new", text: "GitHub-style activity calendar and a before/after consistency graph on your profile." },
      { tag: "new", text: "Global ⌘K command palette to jump anywhere instantly." },
      { tag: "new", text: "Per-pattern mastery progress and reading progress for System Design notes." },
    ],
  },
];
