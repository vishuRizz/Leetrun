import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  generateDailyChallenge,
  generateWeeklyChallenge,
  generateRevisionChallenge,
  verifyChallengeCompletion,
} from "@/lib/services/challenge";
import { syncUserProfile } from "@/lib/leetcode/service";
import { ChallengeStatus, ChallengeType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Sync Leetcode profile first to make sure we check completion
    const profile = await db.leetcodeProfile.findUnique({
      where: { userId: user.id },
    });
    if (profile) {
      await syncUserProfile(user.id, profile.username).catch(() => {});
      await verifyChallengeCompletion(user.id).catch(() => {});
    }

    // Orchestrate/Fetch each type of active challenge
    const getOrCreateChallenge = async (type: ChallengeType) => {
      let active = await db.userChallenge.findFirst({
        where: {
          userId: user.id,
          status: ChallengeStatus.ACTIVE,
          challenge: {
            type,
          },
        },
        include: {
          challenge: {
            include: {
              problems: true,
            },
          },
        },
      });

      if (!active) {
        // If no active, check if one was completed recently (today/this week)
        const rangeStart = new Date();
        if (type === ChallengeType.WEEKLY) {
          // Check last 7 days for weekly quests
          rangeStart.setDate(rangeStart.getDate() - 7);
        } else {
          // Check today for daily and revision quests
          rangeStart.setHours(0, 0, 0, 0);
        }

        const completedRecently = await db.userChallenge.findFirst({
          where: {
            userId: user.id,
            status: ChallengeStatus.COMPLETED,
            challenge: {
              type,
            },
            completedAt: {
              gte: rangeStart,
            },
          },
          include: {
            challenge: {
              include: {
                problems: true,
              },
            },
          },
        });

        if (completedRecently) {
          return completedRecently;
        }

        // Generate new
        let result;
        if (type === ChallengeType.DAILY) {
          result = await generateDailyChallenge(user.id);
        } else if (type === ChallengeType.WEEKLY) {
          result = await generateWeeklyChallenge(user.id);
        } else {
          result = await generateRevisionChallenge(user.id);
        }

        active = await db.userChallenge.findUnique({
          where: { id: result.userChallenge.id },
          include: {
            challenge: {
              include: {
                problems: true,
              },
            },
          },
        });
      }

      return active;
    };

    const daily = await getOrCreateChallenge(ChallengeType.DAILY);
    const weekly = await getOrCreateChallenge(ChallengeType.WEEKLY);
    const revision = await getOrCreateChallenge(ChallengeType.REVISION);

    return NextResponse.json({
      active: true,
      challenge: daily, // Backwards compatibility for dashboard
      daily,
      weekly,
      revision,
    });
  } catch (error: any) {
    console.error("Error in /api/challenge/active GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve active challenges." },
      { status: 500 }
    );
  }
}
