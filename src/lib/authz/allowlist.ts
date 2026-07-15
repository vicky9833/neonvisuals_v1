/**
 * ============================================================================
 * ROUTE ALLOWLIST — default-deny page authorization (Prompt 2, item 2)
 * ============================================================================
 * The SINGLE explicit list of page routes and the access class each requires.
 * The proxy (middleware) resolves a request against this list; anything NOT on
 * the list DENIES BY DEFAULT (403). This is the primary gate — per-file calls
 * are defense-in-depth, not the mechanism.
 *
 * Access classes:
 *   - public      : no auth (marketing, legal, public flows)
 *   - auth        : login/register/etc — bounce authenticated users away
 *   - onboarding  : authenticated; the create/join-org screen
 *   - tenant      : requires >=1 active company_members row
 *                   (0 memberships => NEW USER => redirect to onboarding)
 *   - platform    : requires platform_staff membership (else 403)
 *
 * API routes (`/api/*`) are NOT governed here — each route handler enforces its
 * own capability via requirePlatform/requireTenant/requireApiAuth (Stage A).
 * The proxy passes `/api/*` through. Public API endpoints (lead capture,
 * webhooks, contact) are self-declared public in their handlers.
 *
 * This module is PURE (no next/*, no supabase) so the proxy can import it.
 * ============================================================================
 */
export type PageAccess =
  | "public"
  | "auth"
  | "onboarding"
  | "tenant"
  | "platform"
  | "denied"; // explicitly blocked (e.g. /ops/vendors — no vendor management)

interface Entry {
  /** Match a path exactly, or as a prefix (path === p or startsWith p + "/"). */
  path: string;
  exact?: boolean;
  access: PageAccess;
}

/**
 * ORDERED — first match wins. Protected trees are listed before public prefixes
 * so `/ops` and `/dashboard` never fall through to a public rule.
 */
const ALLOWLIST: readonly Entry[] = [
  // --- Explicitly DENIED (before the /ops prefix) ---
  // project.md: no vendor management; §6B has no vendor capability. The orphan
  // /ops/vendors route is blocked outright rather than platform-gated.
  { path: "/ops/vendors", access: "denied" },

  // --- Platform plane ---
  { path: "/ops", access: "platform" },

  // --- Tenant plane ---
  { path: "/dashboard", access: "tenant" },

  // --- Auth flow ---
  { path: "/onboarding", exact: true, access: "onboarding" },
  { path: "/login", exact: true, access: "auth" },
  { path: "/register", exact: true, access: "auth" },
  { path: "/forgot-password", exact: true, access: "auth" },
  { path: "/verify", exact: true, access: "auth" },
  { path: "/auth", access: "public" }, // /auth/callback (OAuth/email confirm)

  // --- Public marketing + legal + public flows ---
  { path: "/", exact: true, access: "public" },
  { path: "/about", access: "public" },
  { path: "/blog", access: "public" },
  { path: "/collections", access: "public" },
  { path: "/contact", access: "public" },
  { path: "/faq", access: "public" },
  { path: "/get-quote", access: "public" },
  { path: "/get-started", access: "public" },
  { path: "/gift-builder", access: "public" },
  { path: "/how-it-works", access: "public" },
  { path: "/occasions", access: "public" },
  { path: "/pricing", access: "public" },
  { path: "/privacy", access: "public" },
  { path: "/products", access: "public" },
  { path: "/terms", access: "public" },
  { path: "/payment-status", access: "public" },
];

/**
 * Resolve the access class for a page path, or `null` when the path is NOT on
 * the allowlist (→ the proxy must default-deny with 403).
 */
export function pageAccessFor(pathname: string): PageAccess | null {
  for (const e of ALLOWLIST) {
    if (e.exact) {
      if (pathname === e.path) return e.access;
    } else if (pathname === e.path || pathname.startsWith(e.path + "/")) {
      return e.access;
    }
  }
  return null;
}

/** The raw allowlist, for documentation/evidence. */
export const ALLOWLIST_ENTRIES = ALLOWLIST;

/** Resolved auth state the proxy passes to the pure decision function. */
export interface RequestAuthState {
  authenticated: boolean;
  isPlatform: boolean;
  hasMembership: boolean;
}

export type PageDecision =
  | { type: "pass" }
  | { type: "deny"; status: 403; body: string }
  | { type: "redirect"; to: string };

/**
 * PURE default-deny page decision (Prompt 2, item 2). Given the allowlist
 * access class (or null = not listed) and the caller's auth state, returns the
 * proxy's action. Kept pure so it is unit-testable without a running server.
 *
 * Tenant plane THREE outcomes: pass / deny(403) / no-membership→onboarding.
 */
export function resolvePageDecision(
  access: PageAccess | null,
  s: RequestAuthState,
): PageDecision {
  // DEFAULT DENY: not on the allowlist.
  if (access === null) return { type: "deny", status: 403, body: "Forbidden — route not on allowlist" };
  // Explicitly denied route (e.g. /ops/vendors).
  if (access === "denied") return { type: "deny", status: 403, body: "Forbidden — route disabled" };
  if (access === "public") return { type: "pass" };

  if (!s.authenticated) {
    if (access === "auth") return { type: "pass" };
    return { type: "redirect", to: "/login" };
  }

  switch (access) {
    case "auth":
      return { type: "redirect", to: s.isPlatform ? "/ops" : s.hasMembership ? "/dashboard" : "/onboarding" };
    case "onboarding":
      if (s.isPlatform) return { type: "redirect", to: "/ops" };
      if (s.hasMembership) return { type: "redirect", to: "/dashboard" };
      return { type: "pass" };
    case "platform":
      return s.isPlatform
        ? { type: "pass" }
        : { type: "deny", status: 403, body: "Forbidden — platform access required" };
    case "tenant":
      if (s.isPlatform) return { type: "redirect", to: "/ops" };
      if (!s.hasMembership) return { type: "redirect", to: "/onboarding" };
      return { type: "pass" };
    default:
      return { type: "deny", status: 403, body: "Forbidden" };
  }
}
