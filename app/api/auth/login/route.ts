import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/auth/ensure-user";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      await ensureDbUser(data.user).catch((err) => {
        console.error("Failed to ensure DB user on login:", err);
      });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error("Error in /api/auth/login:", error);
    return NextResponse.json(
      { error: error.message || "Login failed." },
      { status: 500 }
    );
  }
}
