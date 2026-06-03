import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Clear the Supabase session cookies server-side (required for reliable logout). */
export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/auth/logout:", error);
    return NextResponse.json(
      { error: error.message || "Logout failed." },
      { status: 500 }
    );
  }
}
