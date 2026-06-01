import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRoomChallenge } from "@/lib/services/room";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, topic, difficulty, count, deadlineHours } = await request.json();

    if (!roomId || !topic || !difficulty || !count) {
      return NextResponse.json({ error: "All configuration options are required." }, { status: 400 });
    }

    const challenge = await createRoomChallenge(
      user.id,
      roomId,
      topic,
      difficulty,
      Number(count),
      Number(deadlineHours || 24)
    );

    return NextResponse.json({ success: true, challenge });
  } catch (error: any) {
    console.error("Error in /api/room/challenge/post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create room challenge." },
      { status: 550 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Room ID is required." }, { status: 400 });
    }

    // Verify membership
    const member = await db.roomMember.findFirst({
      where: { roomId, userId: user.id },
    });

    if (!member) {
      return NextResponse.json({ error: "Access denied. Not a lobby member." }, { status: 403 });
    }

    // Verify room challenge completions for current user
    const { verifyRoomChallengeCompletion } = await import("@/lib/services/room");
    await verifyRoomChallengeCompletion(user.id, roomId).catch((err) => {
      console.error("Failed to verify room challenge completion:", err);
    });

    // Get active room challenges with completion trackers (all progress fields)
    const activeChallenges = await db.roomChallenge.findMany({
      where: { roomId },
      include: {
        challenge: {
          include: {
            problems: true,
          },
        },
        progress: {
          select: {
            id: true,
            userId: true,
            completed: true,
            completedAt: true,
            claimed: true,
            claimedAt: true,
            verified: true,
            verifiedAt: true,
            markedPreSolved: true,
            xpAwarded: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, challenges: activeChallenges });
  } catch (error: any) {
    console.error("Error in /api/room/challenge/get:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch challenges." },
      { status: 500 }
    );
  }
}
