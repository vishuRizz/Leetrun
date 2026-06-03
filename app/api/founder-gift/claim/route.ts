import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { SubscriptionPlan } from "@prisma/client";

/**
 * Founder's free PRO gift. Idempotent: if the user has already been gifted
 * (FOUNDER_GIFT_GRANTED event present) we just return success without
 * creating a second subscription.
 *
 * The "subscription" is a permanent gift - endDate is set ~100 years out
 * so existing PREMIUM-gating logic continues to work without changes.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.userEvent.findFirst({
      where: { userId: authUser.id, eventType: "FOUNDER_GIFT_GRANTED" },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyClaimed: true });
    }

    const startDate = new Date();
    // Lifetime gift - 100 years out is the simplest, safest expression.
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100);

    await db.$transaction([
      db.user.update({
        where: { id: authUser.id },
        data: { plan: SubscriptionPlan.PREMIUM },
      }),
      db.subscription.create({
        data: {
          userId: authUser.id,
          razorpayPaymentId: `founder_gift_${authUser.id}`,
          active: true,
          startDate,
          endDate,
        },
      }),
      db.userEvent.create({
        data: {
          userId: authUser.id,
          eventType: "FOUNDER_GIFT_GRANTED",
          metadata: {
            grantedBy: "Mr Vishu",
            note: "Founder's gift - lifetime PRO access.",
            startDate,
            endDate,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true, alreadyClaimed: false });
  } catch (error: any) {
    console.error("Error in /api/founder-gift/claim:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim the gift." },
      { status: 500 }
    );
  }
}
