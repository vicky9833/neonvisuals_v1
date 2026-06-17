import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase auth redirect handler. Covers OAuth (Google), email confirmation,
 * and password-reset callbacks: exchanges the `code` for a session, then routes
 * the user to onboarding or their requested destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Send unboarded users through onboarding first.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_onboarded")
    .eq("id", data.user.id)
    .single();

  const destination = profile?.is_onboarded ? next : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
