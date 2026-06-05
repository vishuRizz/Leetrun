import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Permanently delete the user's account: their Prisma row (which cascades to
 * all related data) and their Supabase auth identity. Irreversible.
 *
 * Requires the caller to type the exact confirmation phrase to guard against
 * accidental deletion.
 */
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
    if (body?.confirm !== "DELETE") {
      return NextResponse.json(
        { error: "Confirmation phrase required." },
        { status: 400 }
      );
    }

    // 1. Delete the DB user (cascades to all owned rows via onDelete: Cascade).
    await db.user.deleteMany({ where: { id: user.id } });

    // 2. Delete the Supabase auth identity so the email can be reused and no
    //    orphaned login remains.
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authErr) {
      console.error("Failed to delete Supabase auth user:", authErr);
      // DB data is already gone; surface a soft error but treat as deleted.
    }

    // 3. End the current session.
    await supabase.auth.signOut().catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/account/delete:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}
