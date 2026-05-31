import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { sendRoomInvite, respondToRoomInvite } from "@/lib/services/room";

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
    const { action } = body;

    if (action === "send") {
      const { receiverId, roomId } = body;
      if (!receiverId || !roomId) {
        return NextResponse.json({ error: "Receiver ID and Room ID are required." }, { status: 400 });
      }
      const invite = await sendRoomInvite(user.id, receiverId, roomId);
      return NextResponse.json({ success: true, invite });
    } else if (action === "respond") {
      const { inviteId, accept } = body;
      if (!inviteId || accept === undefined) {
        return NextResponse.json({ error: "Invite ID and Accept parameter are required." }, { status: 400 });
      }
      const result = await respondToRoomInvite(user.id, inviteId, accept);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/room/invite POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process invitation action." },
      { status: 500 }
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

    // Retrieve pending invitations
    const invites = await db.roomInvite.findMany({
      where: {
        receiverId: user.id,
        accepted: false,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            roomCode: true,
          },
        },
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, invites });
  } catch (error: any) {
    console.error("Error in /api/room/invite GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve invitations." },
      { status: 500 }
    );
  }
}
