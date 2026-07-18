import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  getFestivalPreferences,
  saveFestivalPreferences,
} from "@/lib/engines/occasions";
import { createClient } from "@/lib/supabase/server";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { festivalLimit, gateMessage } from "@/lib/employees/plan-gate";

export const runtime = "nodejs";

const schema = z.object({
  preferences: z.array(
    z.object({
      festival_id: z.string().uuid(),
      is_active: z.boolean(),
      custom_date: z.string().nullable().optional(),
      // P9b §R2: per-org festival display override (display-only; never touches the stable key).
      display_name_override: z.string().trim().max(80).nullable().optional(),
    }),
  ),
});

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const data = await getFestivalPreferences(profile.company_id);
    return NextResponse.json({ data });
  } catch (err) {
    return handle(err, "festivals_failed");
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "no_company", message: "No company linked." },
        { status: 400 },
      );
    }
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }

    // §8 festival cap: Free = 3 opted-in festivals, Pro/platform = unlimited. Compute the
    // resulting active set (existing active ∪ submitted-active) − submitted-inactive.
    const plan = await getCompanyPlanContext(profile.company_id);
    const limit = festivalLimit({ plan: plan.plan, planStatus: plan.planStatus, planOverrideBy: plan.planOverrideBy, isDemo: plan.isDemo, isPlatformStaff: profile.isPlatformStaff });
    if (Number.isFinite(limit)) {
      const supabase = await createClient();
      const { data: existing } = await supabase
        .from("company_festivals")
        .select("festival_id, is_active")
        .eq("company_id", profile.company_id);
      const active = new Set(
        (existing ?? []).filter((r) => r.is_active as boolean).map((r) => r.festival_id as string),
      );
      for (const p of parsed.data.preferences) {
        if (p.is_active) active.add(p.festival_id);
        else active.delete(p.festival_id);
      }
      if (active.size > limit) {
        return NextResponse.json(
          { error: "plan_gate", reason: "free_festival_limit", message: gateMessage("free_festival_limit") },
          { status: 403 },
        );
      }
    }

    await saveFestivalPreferences(profile.company_id, parsed.data.preferences);
    return NextResponse.json({ data: { saved: parsed.data.preferences.length } });
  } catch (err) {
    return handle(err, "save_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[occasions/festivals]", err);
  return NextResponse.json(
    { error: code, message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
