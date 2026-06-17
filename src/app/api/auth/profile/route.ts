import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

export async function GET() {
  try {
    const profile = await requireApiAuth();
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*, company:companies(*)")
      .eq("id", profile.id)
      .single();
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "profile_failed", message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requireApiAuth();
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", profile.id)
      .select("*, company:companies(*)")
      .single();
    if (error) {
      return NextResponse.json({ error: "update_failed", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}
