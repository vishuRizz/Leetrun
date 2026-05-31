import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { UserLevel, Difficulty } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      collegeName,
      graduationYear,
      targetCompany,
      timeline,
      lcUsername,
      quizScore,
      totalQuestions,
      mentorName,
      mentorVibe,
      favoriteSeries,
    } = body;

    // Validate essential fields
    if (!fullName || !collegeName) {
      return NextResponse.json(
        { error: "Name and College details are required." },
        { status: 400 }
      );
    }

    // 1. Calibrate initial UserLevel
    let totalSolved = 0;
    if (lcUsername) {
      const lcProfile = await db.leetcodeProfile.findUnique({
        where: { userId: user.id },
      });
      if (lcProfile) {
        totalSolved = lcProfile.totalSolved;
      }
    }

    let calibratedLevel: UserLevel = UserLevel.BEGINNER;
    if (totalSolved >= 300) {
      calibratedLevel = UserLevel.ADVANCED;
    } else if (totalSolved >= 100 || (totalSolved >= 20 && quizScore >= 3) || quizScore >= 4) {
      calibratedLevel = UserLevel.INTERMEDIATE;
    }

    // 2. Set default preferred difficulty based on level
    let preferredDifficulty: Difficulty = Difficulty.EASY;
    if (calibratedLevel === UserLevel.ADVANCED) {
      preferredDifficulty = Difficulty.HARD;
    } else if (calibratedLevel === UserLevel.INTERMEDIATE) {
      preferredDifficulty = Difficulty.MEDIUM;
    }

    // 3. Define AI Mentor system prompt based on chosen vibe
    let personalityPrompt = "";
    switch (mentorVibe) {
      case "Strict":
        personalityPrompt = `You are ${mentorName}, a strict, direct, and no-nonsense DSA coding coach. Keep responses short, highly analytical, and call out user inconsistency immediately. Do not tolerate excuses.`;
        break;
      case "Funny":
        personalityPrompt = `You are ${mentorName}, a humorous and witty DSA coding mentor. Use sarcasm, light memes, and funny placement analogies to keep the user engaged while enforcing streak consistency.`;
        break;
      case "Professional":
        personalityPrompt = `You are ${mentorName}, a highly professional, encouraging, and industry-oriented placement advisor. Focus on career preparedness, mock interviews, and structure.`;
        break;
      default:
        personalityPrompt = `You are ${mentorName}, a warm, friendly, and supportive coding buddy. Motivate the user constantly, give easy explanations, and keep the vibe very casual.`;
        break;
    }

    // 4. Run prisma transactional updates
    await db.$transaction(async (tx) => {
      // Update User profile
      await tx.user.update({
        where: { id: user.id },
        data: {
          fullName,
          collegeName,
          graduationYear,
          targetCompany,
          favoriteSeries: favoriteSeries || "NARUTO",
          level: calibratedLevel,
          onboardingDone: true,
        },
      });

      // Update UserPreference
      await tx.userPreference.upsert({
        where: { userId: user.id },
        update: {
          preferredDifficulty,
          mentorName,
        },
        create: {
          userId: user.id,
          preferredDifficulty,
          mentorName,
        },
      });

      // Create AICompanion
      await tx.aICompanion.upsert({
        where: { userId: user.id },
        update: {
          name: mentorName,
          personalityPrompt,
        },
        create: {
          userId: user.id,
          name: mentorName,
          personalityPrompt,
        },
      });

      // Setup placeholder first challenge to prevent empty dashboard states
      const firstChallenge = await tx.challenge.create({
        data: {
          title: "Warm Up Quest",
          description: "Get started with fundamental DSA challenges",
          type: "DAILY",
          difficulty: preferredDifficulty,
          xpReward: 50,
          problems: {
            create: [
              {
                problemName: "Two Sum",
                problemSlug: "two-sum",
                difficulty: "EASY",
                topic: "Arrays",
              },
              {
                problemName: "Valid Palindrome",
                problemSlug: "valid-palindrome",
                difficulty: "EASY",
                topic: "Strings",
              },
            ],
          },
        },
      });

      await tx.userChallenge.create({
        data: {
          userId: user.id,
          challengeId: firstChallenge.id,
          status: "ACTIVE",
          progress: 0,
        },
      });

      // Log Event
      await tx.userEvent.create({
        data: {
          userId: user.id,
          eventType: "ONBOARDING_COMPLETE",
          metadata: {
            calibratedLevel,
            quizScore,
            lcConnected: !!lcUsername,
          },
        },
      });
    });

    // Update metadata on supabase user session so middleware can read it without database queries
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { onboardingDone: true, mentorName },
    });

    return NextResponse.json({ success: true, calibratedLevel });
  } catch (error: any) {
    console.error("Error in /api/onboarding/submit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit onboarding data." },
      { status: 550 }
    );
  }
}
