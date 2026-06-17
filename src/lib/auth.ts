import "server-only";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileWithCompany, Role } from "@/lib/auth-types";

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

export async function getRole(): Promise<Role | null> {
  const profile = await getProfile();
  return profile?.role ?? null;
}

export async function isOnboarded(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.is_onboarded === true;
}

/**
 * Guarantees an authenticated, profiled request — otherwise redirects to
 * /login. Returns the profile for convenience.
 */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Guarantees the user holds one of the allowed roles. Redirects unauthenticated
 * users to /login and wrong-role users to /dashboard.
 */
export async function requireRole(role: Role | Role[]): Promise<Profile> {
  const profile = await requireAuth();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(profile.role)) redirect("/dashboard");
  return profile;
}
