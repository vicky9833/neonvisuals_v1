import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePricing } from "@/lib/engines/pricing";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";

// Internal pricing - super_admin only.
export const runtime = "nodejs";

const schema = z.object({
  products: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })).min(1),
  kitCount: z.number().int().positive(),
  packagingTier: z.enum(["essential", "standard", "premium", "flagship"]),
  rushOrder: z.boolean(),
  rushDays: z.number().int().optional(),
  personalisation: z.enum(["name_only", "name_occasion", "full_personal"]),
  resumeIntelligence: z.boolean(),
});

export async function POST(request: Request) {
  try {
    await requireApiRole(["super_admin"]);
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid or missing request body." }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const result = await calculatePricing(parsed.data);
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[pricing/calculate]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not calculate pricing. Please try again." },
      { status: 500 },
    );
  }
}
