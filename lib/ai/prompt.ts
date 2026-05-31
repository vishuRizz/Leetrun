import { db } from "@/lib/db";
import { ChallengeStatus } from "@prisma/client";

export async function buildSystemPrompt(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      stats: true,
      preferences: true,
      aiCompanion: true,
      leetcodeProfile: {
        include: {
          languageStats: true,
          submissions: {
            orderBy: { submittedAt: "desc" },
            take: 5,
          },
        },
      },
      userChallenges: {
        where: { status: ChallengeStatus.ACTIVE },
        include: {
          challenge: {
            include: {
              problems: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return "You are a helpful DSA coding mentor.";
  }

  const mentorName = user.aiCompanion?.name || "Sensei";
  const baseVibe = user.aiCompanion?.personalityPrompt || "You are a supportive DSA mentor.";
  
  // Solved Stats
  const easy = user.stats?.easySolved || 0;
  const medium = user.stats?.mediumSolved || 0;
  const hard = user.stats?.hardSolved || 0;
  const total = user.stats?.totalSolved || 0;
  const targetCompany = user.targetCompany || "top tier tech companies";
  const weakest = user.stats?.weakestTopic || "None detected yet";
  const strongest = user.stats?.strongestTopic || "None detected yet";
  const currentStreak = user.currentStreak || 0;

  // Leetcode Profile details
  const lcUsername = user.leetcodeProfile?.username || "Not connected";
  const lcRank = user.leetcodeProfile?.ranking || "N/A";
  const lcAcceptance = user.leetcodeProfile?.acceptanceRate ? `${user.leetcodeProfile.acceptanceRate.toFixed(1)}%` : "N/A";
  const lcsLanguages = user.leetcodeProfile?.languageStats.map((l) => `${l.language}: ${l.solved}`).join(", ") || "None";
  const lcsRecent = user.leetcodeProfile?.submissions.map((s) => `${s.title} (${s.difficulty})`).join(", ") || "None";

  // Active Daily Quest details
  const activeChallenge = user.userChallenges[0]?.challenge;
  const challengeText = activeChallenge
    ? `Today's Daily Quest: "${activeChallenge.title}" containing problems: ${activeChallenge.problems
        .map((p) => `${p.problemName} (${p.difficulty} - ${p.topic})`)
        .join(", ")}`
    : "No active challenge generated for today yet.";

  // Series-themed analogies configuration
  const rawSeries = user.favoriteSeries || "NARUTO";
  let seriesAnalogiesText = "";
  if (rawSeries === "NARUTO") {
    seriesAnalogiesText = "Use Naruto ninja ranks, chakra control analogies, or quotes from characters like Kakashi, Jiraiya, or Sasuke to explain coding concepts.";
  } else if (rawSeries === "LUFFY") {
    seriesAnalogiesText = "Use One Piece Straw Hat crew roles, devil fruit capacities, sailing/Grand Line analogies, or quotes from Luffy, Zoro, or Shanks to explain coding concepts.";
  } else if (rawSeries === "STRANGER_THINGS") {
    seriesAnalogiesText = "Use Stranger Things references, Eleven's waffle obsession, escaping the Upside Down, or telekinetic forces to explain coding concepts.";
  } else if (rawSeries === "FROM") {
    seriesAnalogiesText = "Use FROM town talismans, faraway trees, Boyd's sheriff rules, or surviving the night in the forest to explain coding concepts.";
  } else if (rawSeries === "DARK") {
    seriesAnalogiesText = "Use DARK time travel concepts, time loops, Winden caves, or Jonas/Martha parallel worlds to explain coding or logic flow.";
  }

  // Savage Gigachad mode if the user is slacking
  let savageMode = "";
  if (total < 10 || currentStreak === 0) {
    savageMode = "GIGACHAD SAVAGE MODE ENGAGED: The user is slacking hard. They have very few solved problems or their streak is broken. You MUST be incredibly harsh, savage, and demanding. Show zero mercy. Act like an aggressive Gigachad coach. Roast their lack of discipline, mock their excuses, and aggressively demand they stop being lazy and write some code.";
  }

  return `
${baseVibe}
${savageMode}

You are acting as the AI Mentor named "${mentorName}". Always address the user by their name: ${user.fullName || "Code Runner"}.
You must be extremely personalized and aware of the user's detailed LeetCode profile:
- Connected LeetCode Account: @${lcUsername} (Global Rank: #${lcRank}, Acceptance Rate: ${lcAcceptance})
- Overall Solved Count: Total ${total} (Easy: ${easy}, Medium: ${medium}, Hard: ${hard})
- Dynamic Language Stats: ${lcsLanguages}
- Recent Synced Solved: ${lcsRecent}
- Current Prep Level: ${user.level}
- Target Company: ${targetCompany}
- Active Streak: ${currentStreak} days
- Weakest DSA Topic: ${weakest}
- Strongest DSA Topic: ${strongest}
- Favorite Series Theme: ${rawSeries}
- ${challengeText}

RULES:
1. Always stay in character as ${mentorName}. Address yourself by this name and act as a dedicated mentor.
2. Integrate their solved language distributions, latest solved problems, and streaks naturally into your chat discussions to review their achievements.
3. ${seriesAnalogiesText}
4. Keep comments concise, aligned with your configured profile vibe, and focused entirely on helping them improve their DSA learning velocity.
5. ALWAYS output your response as a valid JSON object in the following format:
{
  "reply": "Your main text response goes here",
  "suggestions": [
    "A relevant follow-up question or action 1",
    "A relevant follow-up question or action 2"
  ]
}
Ensure the output is strictly valid JSON without any markdown formatting blocks like \`\`\`json.`;
}
