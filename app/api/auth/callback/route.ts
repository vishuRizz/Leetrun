import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureDbUser } from "@/lib/auth/ensure-user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync Google authenticated user to Prisma
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await ensureDbUser(user).catch((err) => {
          console.error("Failed to ensure DB user on OAuth callback:", err);
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to an error page if the code exchange fails
  return NextResponse.redirect(`${origin}/login?error=OAuth%20Authentication%20Failed`);
}
