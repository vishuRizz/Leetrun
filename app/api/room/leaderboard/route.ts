import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getLobbyLeaderboard } from "@/lib/services/room";

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

    const member = await db.roomMember.findFirst({
      where: { roomId, userId: user.id },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Access denied. Not a lobby member." },
        { status: 403 }
      );
    }

    const leaderboard = await getLobbyLeaderboard(roomId);
    return NextResponse.json({ success: true, leaderboard });
  } catch (error: any) {
    console.error("Error in /api/room/leaderboard:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch leaderboard." },
      { status: 500 }
    );
  }
}
