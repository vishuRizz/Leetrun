import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ensureUsername, setUsername } from "@/lib/services/username";

const MAX_NAME_LEN = 60;

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
    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : undefined;
    const usernameRaw =
      typeof body.username === "string" ? body.username.trim() : undefined;

    if (fullName !== undefined) {
      if (fullName.length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty." },
          { status: 400 }
        );
      }
      if (fullName.length > MAX_NAME_LEN) {
        return NextResponse.json(
          { error: `Name must be at most ${MAX_NAME_LEN} characters.` },
          { status: 400 }
        );
      }
    }

    if (fullName !== undefined) {
      await db.user.update({
        where: { id: user.id },
        data: { fullName },
      });
    }

    if (usernameRaw !== undefined) {
      try {
        await setUsername(user.id, usernameRaw);
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || "Invalid username." },
          { status: 400 }
        );
      }
    }

    const updated = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, fullName: true, avatarUrl: true, username: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Error in /api/profile PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

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

    // Make sure the caller has a stable public-profile slug.
    const username = await ensureUsername({
      id: dbUser.id,
      username: (dbUser as any).username ?? null,
      fullName: dbUser.fullName,
      email: dbUser.email,
    });

    return NextResponse.json({
      success: true,
      profile: { ...dbUser, username },
    });
  } catch (error: any) {
    console.error("Error in /api/profile GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load user profile details." },
      { status: 500 }
    );
  }
}
