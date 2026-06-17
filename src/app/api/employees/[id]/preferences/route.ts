import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  getEmployeePreferences,
  updateEmployeeArchetype,
} from "@/lib/engines/memory";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  archetype: z.string().optional(),
  giftPersonality: z.string().optional(),
  dietaryNotes: z.string().optional(),
});

export async function GET(_request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const prefs = await getEmployeePreferences(id);
    return NextResponse.json({ data: prefs });
  } catch (err) {
    return handle(err, "prefs_failed");
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "no_company", message: "No company linked." },
        { status: 400 },
      );
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    await updateEmployeeArchetype(profile.company_id, id, parsed.data);
    return NextResponse.json({ data: { id, updated: true } });
  } catch (err) {
    return handle(err, "update_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: code, message }, { status: 500 });
}
