import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maybeAutoDeepSync } from "@/lib/leetcode/deep-sync";

/**
 * Fire-and-forget endpoint hit on page visits (Profile / Analytics / Sheets).
 * Re-runs a deep sync in the background when the user's last deep sync is
 * older than 6 hours and we have a saved session cookie. Returns quickly with
 * the outcome so the client can refresh its data when something actually synced.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const outcome = await maybeAutoDeepSync(user.id);
    return NextResponse.json({ success: true, ...outcome });
  } catch (error: any) {
    console.error("Error in /api/leetcode/auto-sync POST:", error);
    return NextResponse.json(
      { error: error.message || "Auto sync failed." },
      { status: 500 }
    );
  }
}
