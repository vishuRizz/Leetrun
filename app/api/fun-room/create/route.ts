import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function randomSlug(len: number) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

function newRoomId() {
  const s = randomSlug(8);
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

function newCreatorKey() {
  return `${randomSlug(16)}${randomSlug(16)}`;
}

// Registers a fun room and hands the caller a private creator key. The key is
// what later authorizes dissolving the room; it lives only on the creator's
// device and is never part of the shareable link.
export async function POST() {
  try {
    const creatorKey = newCreatorKey();

    // Generate a unique room id (retry on the rare id collision).
    let roomId = newRoomId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.funRoom.findUnique({
        where: { id: roomId },
        select: { id: true },
      });
      if (!existing) break;
      roomId = newRoomId();
    }

    await db.funRoom.create({ data: { id: roomId, creatorKey } });

    return NextResponse.json({ roomId, creatorKey });
  } catch (error: any) {
    console.error("Error in /api/fun-room/create:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create room." },
      { status: 500 }
    );
  }
}
