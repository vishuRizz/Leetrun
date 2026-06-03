import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDeepSyncStatus,
  runDeepLeetcodeSync,
  rerunSavedDeepSync,
  clearSavedLeetcodeCookie,
} from "@/lib/leetcode/deep-sync";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getDeepSyncStatus(user.id);
    return NextResponse.json({ success: true, ...status });
  } catch (error: any) {
    console.error("Error in /api/leetcode/deep-sync GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load deep sync status." },
      { status: 500 }
    );
  }
}

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
    const useSaved = Boolean(body.useSaved);
    const syncSheets = body.syncSheets !== false;
    const saveCookie = body.saveCookie !== false;

    let result;
    if (useSaved) {
      result = await rerunSavedDeepSync(user.id, syncSheets);
    } else {
      const cookie = typeof body.cookie === "string" ? body.cookie.trim() : "";
      if (!cookie) {
        return NextResponse.json(
          { error: "Paste your LeetCode session cookie." },
          { status: 400 }
        );
      }
      result = await runDeepLeetcodeSync(user.id, {
        cookieRaw: cookie,
        saveCookie,
        syncSheets,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deep sync complete — ${result.solvedCount} solved problems imported${
        result.sheetMarked > 0
          ? `, ${result.sheetMarked} sheet problems auto-marked`
          : ""
      }.`,
      result,
    });
  } catch (error: any) {
    console.error("Error in /api/leetcode/deep-sync POST:", error);
    return NextResponse.json(
      { error: error.message || "Deep sync failed." },
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

    await clearSavedLeetcodeCookie(user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/leetcode/deep-sync DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clear saved cookie." },
      { status: 500 }
    );
  }
}
