import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Handles the Supabase auth redirect: exchanges the code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  try {
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
    return NextResponse.redirect(`${origin}/login?error=auth`);
  } catch (err) {
    console.error("[auth/callback]", err);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
