import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

function livekitRoomName(roomId: string) {
  return `lobby-${roomId}`;
}

// LiveKit's server API speaks HTTP(S); the public URL is a ws(s) endpoint.
function httpHost(wsUrl: string) {
  return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

/**
 * Returns whether a live call is currently happening in a lobby and who's in
 * it. Membership-gated. Used by clients to surface a "join the live call" cue
 * to members who haven't joined yet.
 */
export async function GET(request: Request) {
  try {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json({ active: false, count: 0, participants: [] });
    }

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
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }

    const membership = await db.roomMember.findFirst({
      where: { roomId, userId: user.id },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member." }, { status: 403 });
    }

    const svc = new RoomServiceClient(httpHost(url), apiKey, apiSecret);

    let participants: { identity: string; name: string }[] = [];
    try {
      const list = await svc.listParticipants(livekitRoomName(roomId));
      participants = list.map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
      }));
    } catch {
      // Room doesn't exist yet (nobody has joined) → treat as no active call.
      participants = [];
    }

    return NextResponse.json({
      active: participants.length > 0,
      count: participants.length,
      participants,
    });
  } catch (error: any) {
    console.error("Error in /api/livekit/active:", error);
    return NextResponse.json({ active: false, count: 0, participants: [] });
  }
}
