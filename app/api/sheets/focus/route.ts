import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getSheet } from "@/lib/sheets";

/** List the current user's focus sheet slugs. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db.userFocusSheet.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "asc" },
      select: { sheetSlug: true },
    });

    return NextResponse.json({
      success: true,
      focus: rows.map((r) => r.sheetSlug),
    });
  } catch (error: any) {
    console.error("Error in /api/sheets/focus GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load focus sheets." },
      { status: 500 }
    );
  }
}

/** Add a sheet to focus. Body: { sheetSlug } */
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
    const sheetSlug = typeof body.sheetSlug === "string" ? body.sheetSlug : "";

    if (!sheetSlug || !getSheet(sheetSlug)) {
      return NextResponse.json({ error: "Unknown sheet." }, { status: 400 });
    }

    await db.userFocusSheet.upsert({
      where: { userId_sheetSlug: { userId: user.id, sheetSlug } },
      update: {},
      create: { userId: user.id, sheetSlug },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/sheets/focus POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add focus sheet." },
      { status: 500 }
    );
  }
}

/** Remove a sheet from focus. Body: { sheetSlug } */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const sheetSlug = typeof body.sheetSlug === "string" ? body.sheetSlug : "";

    if (!sheetSlug) {
      return NextResponse.json(
        { error: "sheetSlug is required." },
        { status: 400 }
      );
    }

    await db.userFocusSheet
      .delete({
        where: { userId_sheetSlug: { userId: user.id, sheetSlug } },
      })
      .catch(() => {
        // Already removed - idempotent.
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/sheets/focus DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove focus sheet." },
      { status: 500 }
    );
  }
}
