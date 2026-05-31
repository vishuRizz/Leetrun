import { NextResponse } from "next/server";
import { initiateSignup } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const result = await initiateSignup(email.trim().toLowerCase(), password);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/auth/signup:", error);
    return NextResponse.json(
      { error: error.message || "Signup failed." },
      { status: 400 }
    );
  }
}
