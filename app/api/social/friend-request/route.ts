import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendFriendRequest } from "@/lib/services/social";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const friendship = await sendFriendRequest(user.id, email.trim().toLowerCase());
    return NextResponse.json({ success: true, friendship });
  } catch (error: any) {
    console.error("Error in /api/social/friend-request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send request." },
      { status: 400 }
    );
  }
}
