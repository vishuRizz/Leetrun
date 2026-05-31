import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createChallengeRoom } from "@/lib/services/room";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    }

    const room = await createChallengeRoom(user.id, name.trim());
    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("Error in /api/room/create:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create room." },
      { status: 500 }
    );
  }
}
