import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getAdminProduct, updateAdminProduct } from "@/lib/admin/products";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  longDescription: z.string().nullable().optional(),
  whoIsItFor: z.string().nullable().optional(),
  insight: z.string().nullable().optional(),
  bucketId: z.string().uuid().nullable().optional(),
  wowScore: z.number().int().min(1).max(10).nullable().optional(),
  cogs: z.number().nullable().optional(),
  priceSingle: z.number().nullable().optional(),
  priceBulk25: z.number().nullable().optional(),
  priceBulk100: z.number().nullable().optional(),
  leadTimeDays: z.number().int().nullable().optional(),
  moq: z.number().int().nullable().optional(),
  materials: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  recommendedPackaging: z.string().nullable().optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  isFeatured: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  thumbnailUrl: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { sku } = await params;
    const product = await getAdminProduct(sku);
    if (!product) {
      return NextResponse.json(
        { error: "not_found", message: "Product not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: product });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { sku } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const product = await updateAdminProduct(sku, parsed.data);
    return NextResponse.json({ data: product });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}
