import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  occasion_date: z.string().optional(),
  recurrence: z.enum(["none", "yearly", "monthly", "quarterly"]).optional(),
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
    .optional(),
  reminder_days_before: z.array(z.number().int()).optional(),
  employee_ids: z.array(z.string().uuid()).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
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
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (err) {
    return handle(err, "update_failed");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase
      .from("custom_occasions")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return handle(err, "delete_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[occasions/custom/[id]]", err);
  return NextResponse.json(
    { error: code, message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
