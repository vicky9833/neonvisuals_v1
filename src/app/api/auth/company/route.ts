import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  requireApiAuth,
  requireTenant,
  apiAuthErrorResponse,
} from "@/lib/api-auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  employee_count: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo_url: z.string().url().optional(),
  gstin: z.string().optional(),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().email().optional(),
  primary_contact_phone: z.string().optional(),
  gifting_budget: z.string().optional(),
  gifting_occasions: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json({ data: null });
    }
    const supabase = await createClient();
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[auth/company]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load company details." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Company settings update is a TENANT capability (org_owner/org_admin).
    const profile = await requireTenant("settings.manage", null);
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "no_company", message: "No company linked to this account." },
        { status: 400 },
      );
    }
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .update(parsed.data)
      .eq("id", profile.company_id)
      .select("*")
      .single();
    if (error) {
      console.error("[auth/company]", error);
      return NextResponse.json(
        { error: "update_failed", message: "Failed to update company details." },
        { status: 500 },
      );
    }
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[auth/company]", err);
    return NextResponse.json(
      { error: "update_failed", message: "Failed to update company details." },
      { status: 500 },
    );
  }
}
