import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { getKit, mergeKit, setKitItem, removeKitItem, clearKit } from "@/lib/engines/kit";

export const runtime = "nodejs";

const itemSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  unitPrice: z.number().nullable().optional(),
  quantity: z.number().int().positive(),
});

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("merge"), items: z.array(itemSchema) }),
  z.object({ action: z.literal("set"), item: itemSchema }),
]);

/** GET — the caller's OWN kit (RLS-scoped to auth.uid() within their company). */
export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const supabase = await createClient();
    const items = await getKit(supabase, profile.company_id, profile.id);
    return NextResponse.json({ data: items });
  } catch (err) {
    return handle(err);
  }
}

/** POST — merge an anonymous kit (union, qty summed/capped) or set a single item. */
export async function POST(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json({ error: "no_company", message: "No company linked." }, { status: 400 });
    }
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const supabase = await createClient();
    if (parsed.data.action === "merge") {
      const items = await mergeKit(supabase, profile.company_id, profile.id, parsed.data.items);
      return NextResponse.json({ data: items });
    }
    await setKitItem(supabase, profile.company_id, profile.id, parsed.data.item);
    const items = await getKit(supabase, profile.company_id, profile.id);
    return NextResponse.json({ data: items });
  } catch (err) {
    return handle(err);
  }
}

/** DELETE — remove one item (?productId=) or clear the whole kit. */
export async function DELETE(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const supabase = await createClient();
    const productId = new URL(request.url).searchParams.get("productId");
    if (productId) {
      await removeKitItem(supabase, profile.company_id, profile.id, productId);
    } else {
      await clearKit(supabase, profile.company_id, profile.id);
    }
    const items = await getKit(supabase, profile.company_id, profile.id);
    return NextResponse.json({ data: items });
  } catch (err) {
    return handle(err);
  }
}

function handle(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[api/kit]", err);
  return NextResponse.json({ error: "server_error", message: "Kit operation failed." }, { status: 500 });
}
