import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { SubscriptionPlan } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json().catch(() => ({}));

    if (action === "cancel") {
      // Mock Cancel Subscription
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { plan: SubscriptionPlan.FREE },
        }),
        db.subscription.updateMany({
          where: { userId: user.id, active: true },
          data: { active: false, endDate: new Date() },
        }),
      ]);

      return NextResponse.json({ success: true, plan: SubscriptionPlan.FREE });
    }

    // Mock payment/Razorpay checkout
    const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11)}`;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1-month premium membership

    await db.$transaction([
      // Update User table plan to PREMIUM
      db.user.update({
        where: { id: user.id },
        data: { plan: SubscriptionPlan.PREMIUM },
      }),
      // Create Active Subscription record
      db.subscription.create({
        data: {
          userId: user.id,
          razorpayPaymentId: mockPaymentId,
          active: true,
          startDate,
          endDate,
        },
      }),
      // Log event
      db.userEvent.create({
        data: {
          userId: user.id,
          eventType: "SUBSCRIPTION_PREMIUM_UPGRADE",
          metadata: {
            paymentId: mockPaymentId,
            startDate,
            endDate,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true, plan: SubscriptionPlan.PREMIUM });
  } catch (error: any) {
    console.error("Error in /api/subscription/upgrade:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upgrade subscription." },
      { status: 500 }
    );
  }
}
