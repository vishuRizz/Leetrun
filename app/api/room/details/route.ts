import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { leaveChallengeRoom } from "@/lib/services/room";

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
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const room = await db.challengeRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                currentStreak: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Error in /api/room/details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load room details." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    await leaveChallengeRoom(user.id, roomId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/room/details/delete:", error);
    return NextResponse.json(
      { error: error.message || "Failed to leave room." },
      { status: 500 }
    );
  }
}
