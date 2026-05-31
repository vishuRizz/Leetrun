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
    
    // Use the deployed URL
    const signupUrl = "https://leetrun.vercel.app/signup";

    const htmlContent = getInviteEmailHtml(inviterName, signupUrl);

    const data = await resend.emails.send({
      from: "LeetRun <leetrun@vishu.codes>",
      to: [email],
      subject: `${inviterName} has invited you to join LeetRun!`,
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
