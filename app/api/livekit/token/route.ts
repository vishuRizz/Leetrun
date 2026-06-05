import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// A LiveKit room is created on-demand the first time someone joins, so we map
// each lobby to a stable, namespaced room name.
function livekitRoomName(roomId: string) {
  return `lobby-${roomId}`;
}

export async function POST(request: Request) {
  try {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Live calls are not configured on this server." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { roomId } = body || {};

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "roomId is required." },
        { status: 400 }
      );
    }

    // Only lobby members may obtain a token for that lobby's call.
    const membership = await db.roomMember.findFirst({
      where: { roomId, userId: user.id },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this lobby to join the call." },
        { status: 403 }
      );
    }

    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, email: true, avatarUrl: true },
    });

    const displayName =
      profile?.fullName?.trim() ||
      profile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      "Member";

    const room = livekitRoomName(roomId);

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: displayName,
      // Short-lived: enough to join and stay; the SDK reconnects within this.
      ttl: "2h",
      metadata: JSON.stringify({ avatarUrl: profile?.avatarUrl ?? null }),
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, url, room, identity: user.id });
  } catch (error: any) {
    console.error("Error in /api/livekit/token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create call token." },
      { status: 500 }
    );
  }
}
