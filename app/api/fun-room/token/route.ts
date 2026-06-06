import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

// Standalone "just for fun" video rooms. Unlike lobby calls these are NOT
// gated by auth or membership — anyone with the link can hop in by picking a
// name. Rooms are namespaced so they can never collide with study lobbies.
function funRoomName(roomId: string) {
  return `fun-${roomId}`;
}

function randomId(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export async function POST(request: Request) {
  try {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Video rooms are not configured on this server." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const roomIdRaw = typeof body?.roomId === "string" ? body.roomId : "";
    const nameRaw = typeof body?.name === "string" ? body.name : "";

    const roomId = roomIdRaw.trim().toLowerCase();
    // Room ids are short, URL-safe slugs we generate on the client.
    if (!/^[a-z0-9-]{4,64}$/.test(roomId)) {
      return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    }

    const name = nameRaw.trim().slice(0, 40) || "Guest";

    // Unique identity per participant (duplicate display names are allowed).
    const identity = `${name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "guest"}__${randomId(6)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: "4h",
    });

    at.addGrant({
      room: funRoomName(roomId),
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, url, room: funRoomName(roomId), identity });
  } catch (error: any) {
    console.error("Error in /api/fun-room/token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create room token." },
      { status: 500 }
    );
  }
}
