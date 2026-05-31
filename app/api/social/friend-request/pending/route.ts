import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPendingRequests, respondToFriendRequest } from "@/lib/services/social";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pending = await getPendingRequests(user.id);
    return NextResponse.json({ success: true, pending });
  } catch (error: any) {
    console.error("Error in GET /api/social/friend-request/pending:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load pending requests." },
      { status: 500 }
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

    const { requesterId, accept } = await request.json();
    if (!requesterId || accept === undefined) {
      return NextResponse.json({ error: "requesterId and accept parameters are required." }, { status: 400 });
    }

    const friendship = await respondToFriendRequest(user.id, requesterId, accept);
    return NextResponse.json({ success: true, friendship });
  } catch (error: any) {
    console.error("Error in POST /api/social/friend-request/pending:", error);
    return NextResponse.json(
      { error: error.message || "Failed to respond to friend request." },
      { status: 500 }
    );
  }
}
