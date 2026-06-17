import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Refreshes the Supabase auth session inside the root `proxy.ts`
 * (Next.js 16 renamed Middleware to Proxy). Returns the mutated
 * response (with refreshed session cookies), the current user, and the
 * request-scoped Supabase client (so the proxy can read the profile).
 */
export async function updateSession(
  request: NextRequest,
): Promise<{
  response: NextResponse;
  user: User | null;
  supabase: SupabaseClient;
}> {
  let response = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user, supabase };
}
