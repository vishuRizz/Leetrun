import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { uploadAvatar } from "@/lib/supabase/avatars";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Use 'file' field." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP and GIF images are supported." },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be smaller than 2 MB." },
        { status: 413 }
      );
    }

    const ext =
      file.name?.split(".").pop()?.toLowerCase() ||
      file.type.split("/")[1] ||
      "png";

    const publicUrl = await uploadAvatar(user.id, file, ext);

    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({ success: true, avatarUrl: publicUrl });
  } catch (error: any) {
    console.error("Error in /api/profile/avatar POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload avatar." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/profile/avatar DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove avatar." },
      { status: 500 }
    );
  }
}
