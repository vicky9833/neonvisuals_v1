import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
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
    await requirePlatform("platform.products.manage", { entity: "product", action: "product.read" });
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
    console.error("[admin/products/[sku]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load product." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    await requirePlatform("platform.products.manage", { entity: "product", action: "product.update" });
    const { sku } = await params;
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
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
    if (err instanceof Error && /Cannot activate a product with no image/.test(err.message)) {
      return NextResponse.json({ error: "no_image", message: err.message }, { status: 422 });
    }
    console.error("[admin/products/[sku]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to update product." },
      { status: 500 },
    );
  }
}
