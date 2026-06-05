import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * Export all of the user's personal data as a downloadable JSON file (a basic
 * GDPR-style "right to access"). Sensitive secrets (e.g. the encrypted LeetCode
 * session cookie) are deliberately excluded.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        preferences: true,
        stats: true,
        aiCompanion: true,
        badges: { include: { badge: true } },
        topicPerformances: true,
        sheetProgress: true,
        problemNotes: true,
        notesProgress: true,
        notesReadingState: true,
        solveAttempts: true,
        xpLogs: true,
        subscriptions: true,
        leetcodeProfile: {
          include: { languageStats: true, solvedProblems: true },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Strip the encrypted session cookie before exporting.
    const sanitized: any = { ...dbUser };
    if (sanitized.leetcodeProfile) {
      const { sessionCookieEnc: _omit, ...lc } = sanitized.leetcodeProfile;
      sanitized.leetcodeProfile = lc;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email },
      data: sanitized,
    };

    const filename = `leetrun-data-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/account/export:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export data." },
      { status: 500 }
    );
  }
}
