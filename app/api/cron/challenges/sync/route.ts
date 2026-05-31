import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncUserProfile } from "@/lib/leetcode/service";
import { verifyChallengeCompletion } from "@/lib/services/challenge";

export async function GET(request: Request) {
  try {
    // Fetch all active profiles that need sync
    const profiles = await db.leetcodeProfile.findMany({
      select: { userId: true, username: true },
    });

    let syncSuccessCount = 0;
    let completedQuestsCount = 0;

    for (const profile of profiles) {
      try {
        // 1. Sync their profile & submissions
        await syncUserProfile(profile.userId, profile.username);
        syncSuccessCount++;

        // 2. Check and verify active challenges
        const verifyResult = await verifyChallengeCompletion(profile.userId);
        completedQuestsCount += verifyResult.verifiedCount;
      } catch (err) {
        console.error(`Failed to sync cron for user ${profile.userId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers: profiles.length,
      syncedProfiles: syncSuccessCount,
      completedQuests: completedQuestsCount,
    });
  } catch (error: any) {
    console.error("Error in /api/cron/challenges/sync:", error);
    return NextResponse.json(
      { error: error.message || "Cron processing failed." },
      { status: 500 }
    );
  }
}
