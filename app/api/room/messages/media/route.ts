import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertRoomMember, postRoomMessage } from "@/lib/services/room";
import {
  uploadRoomMedia,
  ROOM_MEDIA_ALLOWED_TYPES,
  ROOM_MEDIA_MAX_BYTES,
} from "@/lib/supabase/roomMedia";

export const runtime = "nodejs";

const ALLOWED = new Set<string>(ROOM_MEDIA_ALLOWED_TYPES);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const roomId = String(form.get("roomId") || "");
    const caption = String(form.get("content") || "");
    const source = String(form.get("source") || "lobby");

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Use the 'file' field." },
        { status: 400 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Images, video and PDF only." },
        { status: 415 }
      );
    }
    if (file.size > ROOM_MEDIA_MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be smaller than 15 MB." },
        { status: 413 }
      );
    }

    // Gate before uploading so non-members can't write to storage.
    await assertRoomMember(user.id, roomId);

    const media = await uploadRoomMedia(roomId, user.id, file, file.name);

    const message = await postRoomMessage(user.id, roomId, {
      content: caption,
      source: source === "call" ? "call" : "lobby",
      mediaUrl: media.url,
      mediaType: media.type,
      mediaName: media.name,
    });

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Error in POST /api/room/messages/media:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload media." },
      { status: 400 }
    );
  }
}
