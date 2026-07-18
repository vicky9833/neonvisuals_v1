import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  requireApiAuth,
  requireTenant,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { sanitizeLogoUrl, isValidHexColor } from "@/lib/engines/branding";

export const runtime = "nodejs";

// P9d (R1): logo is an external URL, hardened to https + image extension (no data:/inline-SVG);
// brand colors are hex-validated. "" clears a value back to the NEON fallback.
const hexOrEmpty = z.string().refine((v) => v === "" || isValidHexColor(v), "must be a hex color like #1A1A2E");
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().optional(),
  employee_count: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo_url: z
    .string()
    .refine((v) => v === "" || sanitizeLogoUrl(v) !== null, "must be an https image URL (.png/.jpg/.webp/.gif/.svg)")
    .optional(),
  brand_primary: hexOrEmpty.optional(),
  brand_accent: hexOrEmpty.optional(),
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
    // Normalize branding: "" clears back to NULL (→ NEON fallback at render); logo re-sanitized.
    const update: Record<string, unknown> = { ...parsed.data };
    if ("logo_url" in update) update.logo_url = sanitizeLogoUrl(update.logo_url as string) ?? null;
    if ("brand_primary" in update) update.brand_primary = (update.brand_primary as string) || null;
    if ("brand_accent" in update) update.brand_accent = (update.brand_accent as string) || null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .update(update)
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
