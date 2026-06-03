import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin/config";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        totalXp: true,
        currentStreak: true,
        plan: true,
        createdAt: true,
        stats: { select: { lastSyncedAt: true } },
      },
    });

    return NextResponse.json({
      success: true,
      total: users.length,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        username: u.username,
        avatarUrl: u.avatarUrl,
        totalXp: u.totalXp,
        currentStreak: u.currentStreak,
        plan: u.plan,
        createdAt: u.createdAt,
        lastSyncedAt: u.stats?.lastSyncedAt ?? null,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/admin/users GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load users." },
      { status: 500 }
    );
  }
}
