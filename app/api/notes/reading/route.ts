import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/** GET -> { readSlugs: string[], last: { slug, title } | null } for the user. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows, state] = await Promise.all([
      db.notesProgress.findMany({
        where: { userId: user.id },
        select: { slug: true },
      }),
      db.notesReadingState.findUnique({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      readSlugs: rows.map((r) => r.slug),
      last:
        state?.lastSlug != null
          ? { slug: state.lastSlug, title: state.lastTitle }
          : null,
    });
  } catch (error: any) {
    console.error("Error in /api/notes/reading GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load reading progress." },
      { status: 500 }
    );
  }
}

/** POST { slug, read } -> toggle a topic's read mark. */
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
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const read = Boolean(body.read);
    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    if (read) {
      await db.notesProgress.upsert({
        where: { userId_slug: { userId: user.id, slug } },
        update: {},
        create: { userId: user.id, slug },
      });
    } else {
      await db.notesProgress
        .delete({ where: { userId_slug: { userId: user.id, slug } } })
        .catch(() => {
          /* idempotent */
        });
    }

    return NextResponse.json({ success: true, slug, read });
  } catch (error: any) {
    console.error("Error in /api/notes/reading POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update reading progress." },
      { status: 500 }
    );
  }
}

/** PUT { slug, title } -> remember the user's last reading position. */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 200) : null;
    if (!slug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }

    await db.notesReadingState.upsert({
      where: { userId: user.id },
      update: { lastSlug: slug, lastTitle: title },
      create: { userId: user.id, lastSlug: slug, lastTitle: title },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/notes/reading PUT:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save reading position." },
      { status: 500 }
    );
  }
}
