import { NextResponse } from "next/server";
import { verifySignupOtp } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "A valid 6-digit OTP code is required." }, { status: 400 });
    }

    const result = await verifySignupOtp(email.trim().toLowerCase(), otp.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/auth/verify-signup:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed." },
      { status: 400 }
    );
  }
}
