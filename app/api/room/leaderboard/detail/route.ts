import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getLobbyLeaderboardDetail } from "@/lib/services/room";

/**
 * GET /api/room/leaderboard/detail?roomId=<id>
 *
 * Returns the room metadata, full ranking list, and an activity timeline
 * for the lobby leaderboard detail page. Lazy-loaded: only fetched when
 * the user actually navigates to /rooms/[roomId]/leaderboard.
 */
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
      return NextResponse.json(
        { error: "roomId is required." },
        { status: 400 }
      );
    }

    // Membership check - only lobby members can view its detail.
    const member = await db.roomMember.findFirst({
      where: { roomId, userId: user.id },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Access denied. Not a lobby member." },
        { status: 403 }
      );
    }

    const data = await getLobbyLeaderboardDetail(roomId);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("Error in /api/room/leaderboard/detail:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaderboard detail." },
      { status: 500 }
    );
  }
}
