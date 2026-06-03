import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { connectOrUpdateLeetCodeAccount } from "@/lib/services/leetcode-connect";

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
    const username =
      typeof body.username === "string" ? body.username : "";

    if (!username.trim()) {
      return NextResponse.json(
        { error: "LeetCode username is required." },
        { status: 400 }
      );
    }

    const result = await connectOrUpdateLeetCodeAccount(user.id, username);

    return NextResponse.json({
      success: true,
      ...result,
      message: result.isFirstConnect
        ? "LeetCode connected! Your stats, XP, and personalized quests are ready."
        : "LeetCode profile updated and re-synced.",
    });
  } catch (error: any) {
    console.error("Error in /api/profile/leetcode POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect LeetCode account." },
      { status: 400 }
    );
  }
}
