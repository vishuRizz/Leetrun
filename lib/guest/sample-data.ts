/**
 * Believable dummy data used to render the full product structure for guests
 * (not logged in). Lets us show off the dashboard / analytics for marketing
 * while nudging visitors to sign up.
 */

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildHeatmap(weeks = 12): { date: string; count: number }[] {
  const total = weeks * 7;
  const cells: { date: string; count: number }[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    // Deterministic-ish pattern so it looks active but natural.
    const seed = (i * 1103515245 + 12345) % 9;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const count = weekend ? seed % 3 : seed % 7;
    cells.push({ date, count });
  }
  return cells;
}

export const SAMPLE_DASHBOARD = {
  user: {
    fullName: "Guest Explorer",
    level: "INTERMEDIATE",
    currentStreak: 7,
    totalXp: 1840,
    coins: 320,
    targetCompany: "Google",
    plan: "FREE",
  },
  mentor: { name: "Sensei" },
  daily: {
    userChallengeId: null,
    status: "ACTIVE",
    title: "Daily Quest: Two Sum & Valid Palindrome",
    difficulty: "EASY",
    xpReward: 50,
    description: "Solve today's recommended questions on LeetCode.",
    problems: [
      {
        id: "sample-d1",
        problemName: "Two Sum",
        problemSlug: "two-sum",
        difficulty: "EASY",
        topic: "Arrays",
        completed: true,
        verified: true,
      },
      {
        id: "sample-d2",
        problemName: "Valid Palindrome",
        problemSlug: "valid-palindrome",
        difficulty: "EASY",
        topic: "Strings",
        completed: false,
        verified: false,
      },
    ],
  },
  weekly: {
    userChallengeId: null,
    status: "ACTIVE",
    title: "Weekly Quest: Elite 5 Challenge",
    difficulty: "MEDIUM",
    xpReward: 150,
    description: "Conquer 5 handpicked DSA problems this week for massive rewards.",
    problems: [
      { id: "sample-w1", problemName: "Group Anagrams", problemSlug: "group-anagrams", difficulty: "MEDIUM", topic: "Strings", completed: true, verified: true },
      { id: "sample-w2", problemName: "Merge Intervals", problemSlug: "merge-intervals", difficulty: "MEDIUM", topic: "Intervals", completed: true, verified: false },
      { id: "sample-w3", problemName: "Coin Change", problemSlug: "coin-change", difficulty: "MEDIUM", topic: "Dynamic Programming", completed: false, verified: false },
      { id: "sample-w4", problemName: "Number of Islands", problemSlug: "number-of-islands", difficulty: "MEDIUM", topic: "Graphs", completed: false, verified: false },
      { id: "sample-w5", problemName: "LRU Cache", problemSlug: "lru-cache", difficulty: "MEDIUM", topic: "Design", completed: false, verified: false },
    ],
  },
  revision: {
    userChallengeId: null,
    status: "ACTIVE",
    title: "Revision: Dynamic Programming",
    difficulty: "MEDIUM",
    xpReward: 25,
    description: "Custom revision set. Solve and mark done to claim your XP.",
    problems: [
      { id: "sample-r1", problemName: "House Robber", problemSlug: "house-robber", difficulty: "MEDIUM", topic: "Dynamic Programming", completed: false, verified: false },
    ],
  },
  stats: {
    totalSolved: 248,
    easySolved: 120,
    mediumSolved: 104,
    hardSolved: 24,
    weakestTopic: "Dynamic Programming",
    strongestTopic: "Arrays",
  },
  leetcode: {
    connected: true,
    username: "guest_dev",
    lastSyncedAt: isoDaysAgo(0),
  },
};

export const SAMPLE_ANALYTICS = {
  user: {
    fullName: "Guest Explorer",
    plan: "FREE",
    targetCompany: "Google",
    memberSince: isoDaysAgo(120),
  },
  leetcode: {
    connected: true,
    username: "guest_dev",
    totalSolved: 248,
    easy: 120,
    medium: 104,
    hard: 24,
    acceptanceRate: 64,
    ranking: 184320,
    contestRating: 1685,
    syncedAt: isoDaysAgo(0),
    languages: [
      { language: "C++", solved: 158 },
      { language: "Python", solved: 62 },
      { language: "Java", solved: 28 },
    ],
  },
  progression: {
    level: 19,
    totalXp: 1840,
    xpIntoLevel: 40,
    coins: 320,
    currentStreak: 7,
    longestStreak: 23,
  },
  topics: {
    strong: [
      { topic: "Arrays", mastery: 88, solved: 52, attempts: 59 },
      { topic: "Two Pointers", mastery: 81, solved: 24, attempts: 30 },
      { topic: "Hashing", mastery: 76, solved: 31, attempts: 41 },
      { topic: "Binary Search", mastery: 72, solved: 18, attempts: 25 },
    ],
    weak: [
      { topic: "Dynamic Programming", mastery: 38, confidence: 40 },
      { topic: "Graphs", mastery: 44, confidence: 50 },
      { topic: "Tree DP", mastery: 31, confidence: 35 },
    ],
  },
  quests: {
    completedByType: { DAILY: 34, WEEKLY: 6, REVISION: 12, FRIEND: 3 },
    xpFromQuests: 2480,
  },
  social: { friends: 5, badges: 8 },
  activity: {
    heatmap: buildHeatmap(12),
    activeDays: 58,
    totalRecentSubmissions: 312,
  },
  recentXp: [
    { amount: 50, reason: "Completed Daily Quest", at: isoDaysAgo(0) },
    { amount: 150, reason: "Completed Weekly Quest", at: isoDaysAgo(2) },
    { amount: 40, reason: "Solved a Medium problem", at: isoDaysAgo(3) },
    { amount: 25, reason: "Completed Revision set", at: isoDaysAgo(4) },
    { amount: 15, reason: "Solved an Easy problem", at: isoDaysAgo(5) },
  ],
};
