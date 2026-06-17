import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed Middleware to Proxy. Runs on the Node.js runtime.
 *
 * Handles Supabase session refresh + page-route protection:
 *   /dashboard/*  → authenticated AND onboarded
 *   /admin/*      → authenticated AND role = 'super_admin'
 *   /onboarding   → authenticated (redirect away once onboarded)
 *   auth routes   → redirect to /dashboard when already signed in
 *
 * The public marketing site is never touched. API routes pass through
 * untouched here and enforce their own auth in the route handlers
 * (see src/lib/api-auth.ts).
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/verify";
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isOnboarding = pathname === "/onboarding";

  const isProtected = isDashboard || isAdmin || isOnboarding;

  // Unauthenticated → bounce protected routes to /login (preserve target).
  if (!user) {
    if (isProtected) {
      const url = new URL("/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Authenticated — resolve role + onboarding state from the profile.
  let role: string | null = null;
  let isOnboarded = false;
  if (isProtected || isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_onboarded")
      .eq("id", user.id)
      .single();
    role = (profile?.role as string | null) ?? null;
    isOnboarded = profile?.is_onboarded === true;
  }

  // Already signed in → keep them out of auth screens.
  if (isAuthRoute) {
    return NextResponse.redirect(
      new URL(isOnboarded ? "/dashboard" : "/onboarding", request.url),
    );
  }

  // Admin panel is super_admin only.
  if (isAdmin && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard requires a completed onboarding.
  if (isDashboard && !isOnboarded) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Don't re-run onboarding once finished.
  if (isOnboarding && isOnboarded) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, images and favicon:
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$).*)",
  ],
};
