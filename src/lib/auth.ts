import "server-only";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileWithCompany } from "@/lib/auth-types";

/**
 * Server-side auth helpers for Server Components, Route Handlers, and Server
 * Actions. Each call reads the request-scoped Supabase session via cookies.
 *
 * NOTE: client-side helpers (signIn/signUp/etc.) live in `@/lib/auth-client`
 * to keep the server/client boundary clean.
 */

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Returns the authenticated user, verified against the Supabase server. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user's profile joined with their company, or null. */
export async function getProfile(): Promise<ProfileWithCompany | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, company:companies(*)")
    .eq("id", user.id)
    .single();

  return (data as ProfileWithCompany | null) ?? null;
}

export async function isOnboarded(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.is_onboarded === true;
}

/**
 * Guarantees an authenticated, profiled request - otherwise redirects to
 * /login. Returns the profile for convenience.
 */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

// requireRole()/getRole() were removed in Prompt 2 (item 4): they read the
// deprecated profiles.role. Authorization now flows through the two-plane matrix
// (src/lib/authz/matrix.ts) via requirePlatform/requireTenant in api-auth.ts and
// getAuthContext() in server components.
