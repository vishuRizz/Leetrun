import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { resend } from "@/lib/email/resend";
import { siteConfig } from "@/lib/site";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { FeedbackType } from "@prisma/client";

const TYPES = new Set<string>(Object.values(FeedbackType));
const MAX_LEN = 4000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const type: FeedbackType = TYPES.has(body.type)
      ? (body.type as FeedbackType)
      : FeedbackType.OTHER;
    const pageUrl =
      typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 500) : null;
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().slice(0, 200)
        : user?.email || null;

    if (message.length < 3) {
      return NextResponse.json(
        { error: "Please add a little more detail." },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent")?.slice(0, 400) || null;

    const feedback = await db.feedback.create({
      data: {
        userId: user?.id ?? null,
        type,
        message: message.slice(0, MAX_LEN),
        email,
        pageUrl,
        userAgent,
      },
    });

    // Notify the team (best-effort - never block the user response on email).
    if (process.env.RESEND_API_KEY) {
      resend.emails
        .send({
          from: "LeetRun <leetrun@vishu.codes>",
          to: [siteConfig.email],
          subject: `[Feedback · ${type}] ${message.slice(0, 60)}`,
          html: `
            <h2>New ${type} feedback</h2>
            <p><strong>From:</strong> ${email || "anonymous"} ${
            user?.id ? `(user ${user.id})` : "(guest)"
          }</p>
            <p><strong>Page:</strong> ${pageUrl || "n/a"}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#333">${message.replace(
              /</g,
              "&lt;"
            )}</blockquote>
            <p style="color:#888;font-size:12px">${userAgent || ""}</p>
          `,
        })
        .catch((err) => console.warn("Feedback email failed:", err));
    }

    if (user?.id) {
      captureServerEvent(user.id, "feedback_submitted", { type, pageUrl }).catch(
        () => {}
      );
    }

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error: any) {
    console.error("Error in /api/feedback:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit feedback." },
      { status: 500 }
    );
  }
}
