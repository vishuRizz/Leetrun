import { NextResponse } from "next/server";
import { completePasswordReset } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const { email, otp, password } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "A valid 6-digit OTP code is required." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const result = await completePasswordReset(email.trim().toLowerCase(), otp.trim(), password);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/auth/reset-password:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password." },
      { status: 400 }
    );
  }
}
