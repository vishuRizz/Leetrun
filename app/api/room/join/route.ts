import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinChallengeRoom } from "@/lib/services/room";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomCode } = await request.json();
    if (!roomCode || typeof roomCode !== "string" || roomCode.trim().length !== 6) {
      return NextResponse.json({ error: "A valid 6-character room code is required." }, { status: 400 });
    }

    const room = await joinChallengeRoom(user.id, roomCode.trim());
    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Error in /api/room/join:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join room." },
      { status: 400 }
    );
  }
}
