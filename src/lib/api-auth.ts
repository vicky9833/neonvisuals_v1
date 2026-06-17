import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/auth-types";

/**
 * Auth guards for Route Handlers. On failure they throw an {@link ApiAuthError}
 * which the route's catch block converts into a JSON response via
 * {@link apiAuthErrorResponse}.
 */
export class ApiAuthError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
    this.code = code;
  }
}

/** Requires any authenticated, profiled user. */
export async function requireApiAuth(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiAuthError(401, "unauthenticated", "Authentication required.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new ApiAuthError(401, "no_profile", "No profile found for user.");
  }

  return profile as Profile;
}

/** Requires an authenticated user holding one of the allowed roles. */
export async function requireApiRole(roles: Role[]): Promise<Profile> {
  const profile = await requireApiAuth();
  if (!roles.includes(profile.role)) {
    throw new ApiAuthError(
      403,
      "forbidden",
      "You do not have permission to perform this action.",
    );
  }
  return profile;
}

/** Maps any thrown error to a JSON response, handling ApiAuthError specially. */
export function apiAuthErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof ApiAuthError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status },
    );
  }
  return null;
}
