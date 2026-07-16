import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { pageAccessFor, resolvePageDecision } from "@/lib/authz/allowlist";

/**
 * Next.js 16 renamed Middleware to Proxy. Runs on the Node.js runtime.
 *
 * Prompt 2 (item 2) — DEFAULT-DENY page authorization built on the two-plane
 * model (platform_staff + company_members), NOT profiles.role:
 *   - The explicit allowlist (src/lib/authz/allowlist.ts) classes every page.
 *   - Anything NOT on the allowlist is DENIED (403) by default.
 *   - Tenant pages have THREE outcomes: allow / 403 / no-membership → onboarding
 *     (a user with zero memberships is a NEW USER, not locked out).
 *   - /ops requires platform staff; a tenant user hitting /ops gets 403.
 *
 * Legacy /admin/* URLs (in already-sent emails) 301→ /ops/*. API routes
 * (`/api/*`) self-enforce in their handlers and pass through here.
 */
export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Legacy /admin → /ops redirect (sent emails, bookmarks).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/ops" + pathname.slice("/admin".length);
    return NextResponse.redirect(url);
  }

  // API routes enforce their own capability (Stage A). Pass through.
  if (pathname.startsWith("/api/")) return response;

  const access = pageAccessFor(pathname);

  // Public + unauthenticated fast paths avoid the membership queries.
  if (access === "public") return response;

  let isPlatform = false;
  let hasMembership = false;
  if (user) {
    const [staffRes, membersRes] = await Promise.all([
      supabase.from("platform_staff").select("role").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);
    isPlatform = staffRes.data != null;
    hasMembership = (membersRes.data ?? []).length > 0;
  }

  const decision = resolvePageDecision(access, {
    authenticated: user != null,
    isPlatform,
    hasMembership,
  });

  switch (decision.type) {
    case "pass":
      return response;
    case "deny":
      return new NextResponse(decision.body, { status: decision.status });
    case "redirect": {
      const url = new URL(decision.to, request.url);
      // Preserve the intended target when bouncing to /login — INCLUDING the
      // query string, so e.g. /invite/accept?token=… survives the login bounce
      // (LoginForm reads ?redirect and router.replace()s back to it).
      if (decision.to === "/login") {
        url.searchParams.set("redirect", pathname + request.nextUrl.search);
      }
      return NextResponse.redirect(url);
    }
  }
}

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT Next internals, static assets, and generated
     * metadata routes (robots/sitemap/manifest/opengraph/icon) — those must not
     * be caught by default-deny.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js|xml|txt|webmanifest)$).*)",
  ],
};
