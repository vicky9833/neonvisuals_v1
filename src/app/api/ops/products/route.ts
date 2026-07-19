import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { listAdminProducts, createAdminProduct } from "@/lib/admin/products";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePlatform("platform.products.manage", { entity: "product", action: "product.list" });
    const products = await listAdminProducts();
    return NextResponse.json({ data: products });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load products." },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  bucketId: z.string().uuid(),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  whoIsItFor: z.string().nullable().optional(),
  insight: z.string().nullable().optional(),
  wowScore: z.number().int().min(1).max(10).nullable().optional(),
  tags: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  recommendedPackaging: z.enum(["budget", "standard", "premium", "flagship"]).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    await requirePlatform("platform.products.manage", { entity: "product", action: "product.create" });
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const product = await createAdminProduct(parsed.data);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/products create]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to create product." },
      { status: 500 },
    );
  }
}
