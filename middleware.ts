import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // First, run the Supabase session update
  const response = await updateSession(request);

  // Re-create supabase client to read user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protect internal pages
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path === "/";
    
  const isProtectedRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/profile") ||
    path.startsWith("/challenge") ||
    path.startsWith("/rooms") ||
    path.startsWith("/settings") ||
    path.startsWith("/pricing") ||
    path.startsWith("/analytics") ||
    path.startsWith("/leaderboard") ||
    path.startsWith("/chat") ||
    path.startsWith("/sheets") ||
    path.startsWith("/patterns") ||
    path.startsWith("/side-quests");

  if (!user && isProtectedRoute) {
    // Redirect to login if user is not authenticated and trying to access protected route
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const onboardingDone = user.user_metadata?.onboardingDone === true;

    // Redirect to onboarding if not done and accessing dashboard/other protected routes
    if (!onboardingDone && isProtectedRoute && !path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Redirect to dashboard if onboarding is completed and trying to access onboarding page
    if (onboardingDone && path.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isAuthPage && path !== "/") {
      // Redirect to dashboard if logged in and trying to access auth pages
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
