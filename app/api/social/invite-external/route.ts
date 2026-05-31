import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email/resend";
import { getInviteEmailHtml } from "@/lib/email/templates/invite";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const inviterName = user.user_metadata?.fullName || "A friend";
    
    // We construct the signup URL. If deployed, we'd use the actual hostname. 
    // For now we'll construct it based on the request URL's origin, fallback to localhost.
    let origin = "http://localhost:3000";
    try {
      const url = new URL(request.url);
      origin = url.origin;
    } catch (e) {
      // ignore
    }
    const signupUrl = `${origin}/signup`;

    const htmlContent = getInviteEmailHtml(inviterName, signupUrl);

    const data = await resend.emails.send({
      from: "CodeRun <onboarding@resend.dev>", // resend.dev allows sending to testing emails without a verified domain
      to: [email],
      subject: `${inviterName} has invited you to join CodeRun!`,
      html: htmlContent,
    });

    if (data.error) {
      console.error("Resend error:", data.error);
      return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/social/invite-external:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
