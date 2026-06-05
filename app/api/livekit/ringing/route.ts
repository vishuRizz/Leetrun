import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

function httpHost(wsUrl: string) {
  return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

const ROOM_PREFIX = "lobby-";

/**
 * App-wide "is anyone calling me?" probe. Designed to be cheap enough to poll:
 *   1. one DB query for the caller's lobby memberships
 *   2. one LiveKit `listRooms()` call (returns ONLY rooms with participants)
 *   3. `listParticipants` only for the (usually 0-1) lobbies that are live
 *
 * Returns the active calls in lobbies the user belongs to, including who's in
 * them so the client can show "X started a call in <lobby>".
 */
export async function GET() {
  try {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      return NextResponse.json({ calls: [] });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.roomMember.findMany({
      where: { userId: user.id },
      select: { room: { select: { id: true, name: true } } },
    });
    if (memberships.length === 0) {
      return NextResponse.json({ calls: [] });
    }

    // Map LiveKit room name → lobby metadata for O(1) intersection.
    const byRoomName = new Map<string, { id: string; name: string }>();
    for (const m of memberships) {
      byRoomName.set(`${ROOM_PREFIX}${m.room.id}`, m.room);
    }

    const svc = new RoomServiceClient(httpHost(url), apiKey, apiSecret);

    // listRooms() returns only rooms that currently exist (i.e. have a call).
    let activeRooms: { name: string; numParticipants: number }[] = [];
    try {
      const rooms = await svc.listRooms();
      activeRooms = rooms.map((r) => ({
        name: r.name,
        numParticipants: r.numParticipants,
      }));
    } catch {
      return NextResponse.json({ calls: [] });
    }

    const mine = activeRooms.filter(
      (r) => byRoomName.has(r.name) && r.numParticipants > 0
    );
    if (mine.length === 0) {
      return NextResponse.json({ calls: [] });
    }

    const calls = await Promise.all(
      mine.map(async (r) => {
        const lobby = byRoomName.get(r.name)!;
        let participants: { identity: string; name: string }[] = [];
        try {
          const list = await svc.listParticipants(r.name);
          participants = list.map((p) => ({
            identity: p.identity,
            name: p.name || p.identity,
          }));
        } catch {
          /* fall back to count only */
        }
        return {
          roomId: lobby.id,
          lobbyName: lobby.name,
          count: r.numParticipants,
          participants,
        };
      })
    );

    return NextResponse.json({ calls });
  } catch (error: any) {
    console.error("Error in /api/livekit/ringing:", error);
    return NextResponse.json({ calls: [] });
  }
}
