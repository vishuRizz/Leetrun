import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReferralStats } from "@/lib/services/referral";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getReferralStats(user.id);
    return NextResponse.json({ success: true, ...stats });
  } catch (error: any) {
    console.error("Error in /api/referrals:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load referrals." },
      { status: 500 }
    );
  }
}
