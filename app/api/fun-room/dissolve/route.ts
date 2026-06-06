import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { db } from "@/lib/db";

function httpHost(wsUrl: string) {
  return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

// Owner-only: dissolve a fun room for everyone. Verifying the creator key (held
// privately on the creator's device) authorizes a LiveKit deleteRoom, which
// disconnects all participants so a lingering guest can't keep the call alive.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const roomId = typeof body?.roomId === "string" ? body.roomId.trim().toLowerCase() : "";
    const creatorKey = typeof body?.creatorKey === "string" ? body.creatorKey : "";

    if (!roomId || !/^[a-z0-9-]{4,64}$/.test(roomId)) {
      return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    }

    // Registered rooms (created via the Create button) are protected: only the
    // owner's private key can dissolve them. Unregistered/legacy rooms have no
    // owner to protect, so anyone with the link may end them via /end.
    const room = await db.funRoom.findUnique({ where: { id: roomId } });
    if (room && room.creatorKey !== creatorKey) {
      return NextResponse.json(
        { error: "You're not the owner of this room." },
        { status: 403 }
      );
    }

    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (url && apiKey && apiSecret) {
      try {
        const svc = new RoomServiceClient(httpHost(url), apiKey, apiSecret);
        // Removes all participants and tears the room down on the SFU.
        await svc.deleteRoom(`fun-${roomId}`);
      } catch (e) {
        // Room may already be empty/closed on the server — that's fine.
        console.warn("deleteRoom failed (may be empty already):", e);
      }
    }

    await db.funRoom.delete({ where: { id: roomId } }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/fun-room/dissolve:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dissolve room." },
      { status: 500 }
    );
  }
}
