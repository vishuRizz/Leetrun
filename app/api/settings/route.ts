import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Difficulty } from "@prisma/client";

const VALID_DIFFICULTIES = new Set(Object.values(Difficulty));

/**
 * Update the user's preferences (notification + practice settings). Account
 * basics like name/username are handled by /api/profile, and email/password by
 * Supabase directly from the client.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.emailReminderEnabled === "boolean") {
      data.emailReminderEnabled = body.emailReminderEnabled;
    }

    if ("reminderTime" in body) {
      const t = body.reminderTime;
      if (t === null || (typeof t === "string" && /^\d{2}:\d{2}$/.test(t))) {
        data.reminderTime = t || null;
      } else {
        return NextResponse.json(
          { error: "reminderTime must be HH:MM or null." },
          { status: 400 }
        );
      }
    }

    if (body.dailyQuestionTarget !== undefined) {
      const n = Number(body.dailyQuestionTarget);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return NextResponse.json(
          { error: "dailyQuestionTarget must be between 1 and 20." },
          { status: 400 }
        );
      }
      data.dailyQuestionTarget = n;
    }

    if (body.preferredDifficulty !== undefined) {
      if (!VALID_DIFFICULTIES.has(body.preferredDifficulty)) {
        return NextResponse.json(
          { error: "Invalid preferredDifficulty." },
          { status: 400 }
        );
      }
      data.preferredDifficulty = body.preferredDifficulty;
    }

    if (typeof body.mentorName === "string") {
      const name = body.mentorName.trim().slice(0, 30);
      if (name.length === 0) {
        return NextResponse.json(
          { error: "Mentor name cannot be empty." },
          { status: 400 }
        );
      }
      data.mentorName = name;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const preferences = await db.userPreference.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    // Keep the AI companion name in sync if the mentor name changed.
    if (data.mentorName) {
      await db.aICompanion
        .updateMany({
          where: { userId: user.id },
          data: { name: data.mentorName as string },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error("Error in /api/settings PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
