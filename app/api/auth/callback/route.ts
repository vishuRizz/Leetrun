import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

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
        const prismaUser = await db.user.findUnique({
          where: { id: user.id },
        });

        if (!prismaUser) {
          await db.user.create({
            data: {
              id: user.id,
              email: user.email!,
              fullName: user.user_metadata?.full_name || null,
              avatarUrl: user.user_metadata?.avatar_url || null,
              level: "BEGINNER",
              onboardingDone: false,
              preferences: {
                create: {
                  preferredDifficulty: "EASY",
                  dailyQuestionTarget: 2,
                  mentorName: "Buddy",
                },
              },
              stats: {
                create: {
                  totalSolved: 0,
                  easySolved: 0,
                  mediumSolved: 0,
                  hardSolved: 0,
                },
              },
            },
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to an error page if the code exchange fails
  return NextResponse.redirect(`${origin}/login?error=OAuth%20Authentication%20Failed`);
}
