import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoomMessages, postRoomMessage } from "@/lib/services/room";

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
    const after = searchParams.get("after") || undefined;
    const limit = searchParams.get("limit");
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }

    const messages = await getRoomMessages(user.id, roomId, {
      after,
      limit: limit ? Number(limit) : undefined,
    });
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Error in GET /api/room/messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load messages." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { roomId, content, source } = body || {};
    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
    }

    const message = await postRoomMessage(user.id, roomId, {
      content,
      source: source === "call" ? "call" : "lobby",
    });
    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Error in POST /api/room/messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message." },
      { status: 400 }
    );
  }
}
