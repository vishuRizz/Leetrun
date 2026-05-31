import { NextResponse } from "next/server";
import { initiatePasswordReset } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const result = await initiatePasswordReset(email.trim().toLowerCase());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/auth/forgot-password:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger password recovery." },
      { status: 400 }
    );
  }
}
