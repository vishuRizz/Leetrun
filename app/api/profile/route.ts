import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieve comprehensive user data
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        stats: true,
        preferences: true,
        aiCompanion: true,
        leetcodeProfile: {
          include: {
            languageStats: true,
            submissions: {
              orderBy: { submittedAt: "desc" },
              take: 10,
            },
          },
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found in database." }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: dbUser });
  } catch (error: any) {
    console.error("Error in /api/profile GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load user profile details." },
      { status: 500 }
    );
  }
}
