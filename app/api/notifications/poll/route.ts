import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const ROOM_PREFIX = "lobby-";

function httpHost(wsUrl: string) {
  return wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

/**
 * Unified notification probe for the global bell. Designed to be polled:
 *   1. one DB query for the user's lobby memberships
 *   2. one DB query for new messages across those lobbies (after `since`)
 *   3. one LiveKit `listRooms()` call to find live calls in those lobbies
 *
 * `since` (ISO) bounds the message query so each poll only returns what's new.
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

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : null;

    const memberships = await db.roomMember.findMany({
      where: { userId: user.id },
      select: { room: { select: { id: true, name: true } } },
    });
    if (memberships.length === 0) {
      return NextResponse.json({ messages: [], calls: [], now: now.toISOString() });
    }

    const roomIds = memberships.map((m) => m.room.id);
    const nameById = new Map(memberships.map((m) => [m.room.id, m.room.name]));

    // ── New messages (exclude my own; only since the client's last poll) ──
    let messages: Array<{
      id: string;
      roomId: string;
      lobbyName: string;
      sender: string;
      preview: string;
      hasMedia: boolean;
      createdAt: string;
    }> = [];

    if (since && !isNaN(since.getTime())) {
      const rows = await db.roomMessage.findMany({
        where: {
          roomId: { in: roomIds },
          createdAt: { gt: since },
          userId: { not: user.id },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          roomId: true,
          content: true,
          mediaUrl: true,
          mediaType: true,
          createdAt: true,
          user: { select: { fullName: true, email: true } },
        },
      });
      messages = rows.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        lobbyName: nameById.get(r.roomId) || "Lobby",
        sender: r.user.fullName || r.user.email.split("@")[0],
        preview: r.content
          ? r.content.slice(0, 120)
          : r.mediaType?.startsWith("image/")
          ? "📷 Photo"
          : r.mediaType?.startsWith("video/")
          ? "🎬 Video"
          : "📎 Attachment",
        hasMedia: !!r.mediaUrl,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    // ── Live calls in the user's lobbies (single listRooms intersection) ──
    let calls: Array<{
      roomId: string;
      lobbyName: string;
      count: number;
      participants: { identity: string; name: string }[];
    }> = [];

    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (url && apiKey && apiSecret) {
      try {
        const byRoomName = new Map<string, string>(); // lk room name → roomId
        for (const id of roomIds) byRoomName.set(`${ROOM_PREFIX}${id}`, id);

        const svc = new RoomServiceClient(httpHost(url), apiKey, apiSecret);
        const rooms = await svc.listRooms();
        const mine = rooms.filter(
          (r) => byRoomName.has(r.name) && r.numParticipants > 0
        );

        calls = await Promise.all(
          mine.map(async (r) => {
            const roomId = byRoomName.get(r.name)!;
            let participants: { identity: string; name: string }[] = [];
            try {
              const list = await svc.listParticipants(r.name);
              participants = list.map((p) => ({
                identity: p.identity,
                name: p.name || p.identity,
              }));
            } catch {
              /* count only */
            }
            return {
              roomId,
              lobbyName: nameById.get(roomId) || "Lobby",
              count: r.numParticipants,
              participants,
            };
          })
        );
      } catch {
        /* LiveKit unreachable — just skip calls this tick */
      }
    }

    return NextResponse.json({ messages, calls, now: now.toISOString() });
  } catch (error: any) {
    console.error("Error in /api/notifications/poll:", error);
    return NextResponse.json({ messages: [], calls: [], now: new Date().toISOString() });
  }
}
