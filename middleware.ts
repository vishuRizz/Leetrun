import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path === "/";

  const isPreviewRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/analytics") ||
    path.startsWith("/leaderboard") ||
    path.startsWith("/sheets") ||
    path.startsWith("/patterns") ||
    path.startsWith("/prep") ||
    path.startsWith("/profile") ||
    path.startsWith("/side-quests") ||
    path.startsWith("/notes");

  const isStrictRoute =
    path.startsWith("/onboarding") ||
    path.startsWith("/challenge") ||
    path.startsWith("/rooms") ||
    path.startsWith("/invite") ||
    path.startsWith("/settings") ||
    path.startsWith("/pricing") ||
    path.startsWith("/chat") ||
    path.startsWith("/admin");

  const isProtectedRoute = isPreviewRoute || isStrictRoute;

  if (!user && isStrictRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const onboardingDone = user.user_metadata?.onboardingDone === true;

    if (!onboardingDone && isProtectedRoute && !path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (onboardingDone && path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isAuthPage && path !== "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
