import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * Tells the client whether the founder's PRO gift modal should appear.
 *
 *  - eligible   → user is FREE and has never been gifted before
 *  - claimed    → user already accepted the gift in the past
 *  - ineligible → user already has PREMIUM through some other path (paid)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user, gifted] = await Promise.all([
      db.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, plan: true, onboardingDone: true },
      }),
      db.userEvent.findFirst({
        where: { userId: authUser.id, eventType: "FOUNDER_GIFT_GRANTED" },
        select: { id: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ status: "ineligible" });
    }
    if (gifted) {
      return NextResponse.json({ status: "claimed" });
    }
    if (user.plan === "PREMIUM") {
      // Already premium via paid subscription - don't pester them.
      return NextResponse.json({ status: "ineligible" });
    }

    return NextResponse.json({
      status: "eligible",
      onboardingDone: user.onboardingDone,
    });
  } catch (error: any) {
    console.error("Error in /api/founder-gift/status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load gift status." },
      { status: 500 }
    );
  }
}
