import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  occasion_date: z.string().min(1),
  recurrence: z.enum(["none", "yearly", "monthly", "quarterly"]).default("none"),
  occasion_type: z
    .enum([
      "custom",
      "company_anniversary",
      "team_event",
      "offsite",
      "training",
      "celebration",
      "other",
    ])
    .default("custom"),
  reminder_days_before: z.array(z.number().int()).optional(),
  employee_ids: z.array(z.string().uuid()).optional(),
});

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const supabase = await createClient();
    const { data } = await supabase
      .from("custom_occasions")
      .select("*")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("occasion_date", { ascending: true });
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return handle(err, "list_failed");
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
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("custom_occasions")
      .insert({
        company_id: profile.company_id,
        created_by: profile.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        occasion_date: parsed.data.occasion_date,
        recurrence: parsed.data.recurrence,
        occasion_type: parsed.data.occasion_type,
        reminder_days_before: parsed.data.reminder_days_before ?? [7, 3, 1],
        employee_ids: parsed.data.employee_ids ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return handle(err, "create_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[occasions/custom]", err);
  return NextResponse.json(
    { error: code, message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
