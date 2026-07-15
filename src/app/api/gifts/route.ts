import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getCompanyGiftHistory, recordGift } from "@/lib/engines/memory";

export const runtime = "nodejs";

const recordSchema = z.object({
  employeeId: z.string().uuid(),
  productSku: z.string().min(1),
  productName: z.string().min(1),
  collectionCode: z.string().optional(),
  occasionType: z.string().min(1),
  occasionLabel: z.string().optional(),
  giftedDate: z.string().min(1),
  packagingTier: z.string().optional(),
  personalisationLevel: z.string().optional(),
  narrativeMessage: z.string().optional(),
  engravingText: z.string().optional(),
  deliveryStatus: z
    .enum(["pending", "in_production", "shipped", "delivered", "returned"])
    .optional(),
  deliveredDate: z.string().optional(),
  unitCost: z.number().optional(),
  unitPrice: z.number().optional(),
});

export async function GET(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: { records: [], total: 0 } });
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const result = await getCompanyGiftHistory(profile.company_id, {
      employeeId: searchParams.get("employeeId") ?? undefined,
      occasionType: searchParams.get("occasionType") ?? undefined,
      productSku: searchParams.get("productSku") ?? undefined,
      collectionCode: searchParams.get("collectionCode") ?? undefined,
      dateRange: from && to ? { start: from, end: to } : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    return handle(err);
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
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = recordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const gift = await recordGift(profile.company_id, profile.id, parsed.data);
    return NextResponse.json({ data: gift }, { status: 201 });
  } catch (err) {
    return handle(err);
  }
}

function handle(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[gifts]", err);
  return NextResponse.json(
    { error: "server_error", message: "Failed to process gift request." },
    { status: 500 },
  );
}
