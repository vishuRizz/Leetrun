import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getSheet, validProblemKeys } from "@/lib/sheets";

/** GET ?sheetSlug= - list completed problem keys for the current user. */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sheetSlug = searchParams.get("sheetSlug") || "";

    if (!sheetSlug) {
      return NextResponse.json(
        { error: "sheetSlug query param is required." },
        { status: 400 }
      );
    }

    const rows = await db.sheetProgress.findMany({
      where: { userId: user.id, sheetSlug },
      select: { problemKey: true },
    });

    return NextResponse.json({
      success: true,
      completed: rows.map((r) => r.problemKey),
    });
  } catch (error: any) {
    console.error("Error in /api/sheets/progress GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load progress." },
      { status: 500 }
    );
  }
}

/**
 * Toggle a single sheet problem's completion for the current user.
 * Body: { sheetSlug, problemKey, completed }
 * - completed: true  → upsert a progress row
 * - completed: false → delete the row
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
    const sheetSlug = typeof body.sheetSlug === "string" ? body.sheetSlug : "";
    const problemKey = typeof body.problemKey === "string" ? body.problemKey : "";
    const completed = Boolean(body.completed);

    if (!sheetSlug || !problemKey) {
      return NextResponse.json(
        { error: "sheetSlug and problemKey are required." },
        { status: 400 }
      );
    }

    // Validate the slug + key actually exist in the static sheet catalog.
    const sheet = getSheet(sheetSlug);
    if (!sheet) {
      return NextResponse.json({ error: "Unknown sheet." }, { status: 404 });
    }
    if (!validProblemKeys(sheet).has(problemKey)) {
      return NextResponse.json(
        { error: "Unknown problem for this sheet." },
        { status: 400 }
      );
    }

    if (completed) {
      await db.sheetProgress.upsert({
        where: {
          userId_sheetSlug_problemKey: {
            userId: user.id,
            sheetSlug,
            problemKey,
          },
        },
        update: {},
        create: { userId: user.id, sheetSlug, problemKey },
      });
    } else {
      await db.sheetProgress
        .delete({
          where: {
            userId_sheetSlug_problemKey: {
              userId: user.id,
              sheetSlug,
              problemKey,
            },
          },
        })
        .catch(() => {
          // Already absent - treat as success (idempotent un-mark).
        });
    }

    return NextResponse.json({ success: true, completed });
  } catch (error: any) {
    console.error("Error in /api/sheets/progress POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update progress." },
      { status: 500 }
    );
  }
}
