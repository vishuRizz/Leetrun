import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const MAX_CONTENT = 10000;
const MAX_TITLE = 200;

/**
 * GET            -> all of the current user's notes (map of ref -> note)
 * GET ?ref=slug  -> a single note for that problem reference
 */
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
    const ref = searchParams.get("ref");

    if (ref) {
      const note = await db.problemNote.findUnique({
        where: { userId_problemRef: { userId: user.id, problemRef: ref } },
        select: { problemRef: true, title: true, content: true, updatedAt: true },
      });
      return NextResponse.json({ success: true, note: note ?? null });
    }

    const rows = await db.problemNote.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { problemRef: true, title: true, content: true, updatedAt: true },
    });

    const notes: Record<string, string> = {};
    for (const r of rows) notes[r.problemRef] = r.content;

    return NextResponse.json({ success: true, notes, list: rows });
  } catch (error: any) {
    console.error("Error in /api/notes GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load notes." },
      { status: 500 }
    );
  }
}

/**
 * Upsert a problem note. Body: { ref, title?, content }.
 * An empty/whitespace-only content deletes the note (idempotent).
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
    const ref = typeof body.ref === "string" ? body.ref.trim() : "";
    const title =
      typeof body.title === "string"
        ? body.title.trim().slice(0, MAX_TITLE)
        : null;
    const content =
      typeof body.content === "string" ? body.content.slice(0, MAX_CONTENT) : "";

    if (!ref) {
      return NextResponse.json({ error: "ref is required." }, { status: 400 });
    }

    if (!content.trim()) {
      await db.problemNote
        .delete({
          where: { userId_problemRef: { userId: user.id, problemRef: ref } },
        })
        .catch(() => {
          /* already absent - idempotent */
        });
      return NextResponse.json({ success: true, deleted: true });
    }

    const note = await db.problemNote.upsert({
      where: { userId_problemRef: { userId: user.id, problemRef: ref } },
      update: { content, title },
      create: { userId: user.id, problemRef: ref, content, title },
      select: { problemRef: true, title: true, content: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("Error in /api/notes POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save note." },
      { status: 500 }
    );
  }
}

/** Delete a note. Body: { ref }. */
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
    const ref = typeof body.ref === "string" ? body.ref.trim() : "";
    if (!ref) {
      return NextResponse.json({ error: "ref is required." }, { status: 400 });
    }

    await db.problemNote
      .delete({
        where: { userId_problemRef: { userId: user.id, problemRef: ref } },
      })
      .catch(() => {
        /* idempotent */
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/notes DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete note." },
      { status: 500 }
    );
  }
}
