import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin/config";
import { resend } from "@/lib/email/resend";
import { getReengageEmailHtml } from "@/lib/email/templates/reengage";

const CTA_URL = "https://leetrun.vercel.app/dashboard";

function nameFor(email: string, fullName: string | null): string {
  if (fullName && fullName.trim()) return fullName.trim().split(" ")[0];
  return email.split("@")[0];
}

function applyTokens(text: string, name: string): string {
  return text.replace(/\{\{\s*name\s*\}\}/gi, name);
}

/**
 * Admin-only: send a re-engagement email to a set of users. Body:
 *   { emails: string[], subject: string, message: string }
 * `{{name}}` in subject/message is personalized per recipient.
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
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const emails: string[] = Array.isArray(body.emails)
      ? body.emails.filter(
          (e: unknown): e is string =>
            typeof e === "string" && e.includes("@")
        )
      : [];
    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : "";
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message
        : "";

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "Select at least one recipient." },
        { status: 400 }
      );
    }
    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 }
      );
    }

    // Cap per request to stay well within provider limits.
    const MAX = 200;
    const targets = emails.slice(0, MAX);

    // Pull names for personalization in one query.
    const dbUsers = await db.user.findMany({
      where: { email: { in: targets } },
      select: { email: true, fullName: true },
    });
    const nameByEmail = new Map(
      dbUsers.map((u) => [u.email, nameFor(u.email, u.fullName)])
    );

    const results = await Promise.allSettled(
      targets.map((email) => {
        const name = nameByEmail.get(email) || email.split("@")[0];
        const html = getReengageEmailHtml({
          name,
          message: applyTokens(message, name),
          ctaUrl: CTA_URL,
        });
        return resend.emails.send({
          from: "LeetRun <leetrun@vishu.codes>",
          to: [email],
          subject: applyTokens(subject, name),
          html,
        });
      })
    );

    let sent = 0;
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled" && !(r.value as any)?.error) sent++;
      else failed++;
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      requested: targets.length,
    });
  } catch (error: any) {
    console.error("Error in /api/admin/send-email POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send emails." },
      { status: 500 }
    );
  }
}
