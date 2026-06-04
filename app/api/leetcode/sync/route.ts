import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  LEETCODE_USERNAME_TAKEN_MESSAGE,
  syncUserProfile,
} from "@/lib/leetcode/service";
import { db } from "@/lib/db";

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
    let username = body.username;
    const force = Boolean(body.force);

    // If no username provided in the body, try to fetch from their existing profile
    if (!username) {
      const existingProfile = await db.leetcodeProfile.findUnique({
        where: { userId: user.id },
      });
      if (!existingProfile) {
        return NextResponse.json(
          { error: "No LeetCode username provided or connected." },
          { status: 400 }
        );
      }
      username = existingProfile.username;
    }

    const profile = await syncUserProfile(user.id, username, { force });
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error("Error in /api/leetcode/sync:", error);
    if (error?.message === LEETCODE_USERNAME_TAKEN_MESSAGE) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to sync LeetCode profile." },
      { status: 500 }
    );
  }
}
