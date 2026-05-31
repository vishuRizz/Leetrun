import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomMemberships = await db.roomMember.findMany({
      where: { userId: user.id },
      include: {
        room: true,
      },
    });

    const rooms = roomMemberships.map((rm) => rm.room);

    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    console.error("Error in /api/room/list:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list rooms." },
      { status: 500 }
    );
  }
}
