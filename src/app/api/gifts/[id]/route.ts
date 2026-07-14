import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { updateGiftFeedback } from "@/lib/engines/memory";
import type { GiftRecord } from "@/types/gift";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  recipientReaction: z.enum(["loved_it", "liked_it", "neutral", "unknown"]).optional(),
  deskTestStatus: z
    .enum(["on_desk", "kept_elsewhere", "unknown", "not_kept"])
    .optional(),
  feedbackNotes: z.string().optional(),
  linkedinPosted: z.boolean().optional(),
  deliveryStatus: z
    .enum(["pending", "in_production", "shipped", "delivered", "returned"])
    .optional(),
});

export async function GET(_request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await supabase
      .from("gift_records")
      .select("*")
      .eq("id", id)
      .single();
    if (!data) {
      return NextResponse.json({ error: "not_found", message: "Gift not found" }, { status: 404 });
    }
    return NextResponse.json({ data: data as GiftRecord });
  } catch (err) {
    return handle(err);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    await updateGiftFeedback(id, parsed.data);
    return NextResponse.json({ data: { id, updated: true } });
  } catch (err) {
    return handle(err);
  }
}

function handle(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[gifts/[id]]", err);
  return NextResponse.json(
    { error: "server_error", message: "Failed to process gift request." },
    { status: 500 },
  );
}
