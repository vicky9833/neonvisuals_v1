import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePricing, PricingError } from "@/lib/engines/pricing";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";

// Internal pricing - super_admin only.
export const runtime = "nodejs";

// Phase 5A: a line may be a catalogue product, a custom off-catalogue product, or a charge.
// All new fields are optional; a bare { sku, quantity } is a catalogue line (back-compat).
const gstRateSchema = z
  .number()
  .refine((v) => [0, 0.25, 3, 5, 12, 18, 28].includes(v), {
    message: "gstRate must be one of 0, 0.25, 3, 5, 12, 18, 28",
  });

const lineSchema = z
  .object({
    sku: z.string().optional(),
    source: z.enum(["catalogue", "custom", "charge"]).optional(),
    name: z.string().optional(),
    unitPrice: z.number().positive("unitPrice must be greater than 0").optional(),
    quantity: z.number().int().positive("quantity must be a positive integer").optional(),
    gstRate: gstRateSchema.optional(),
    hsn: z.string().regex(/^\d{4,8}$/, "hsn must be 4-8 digits").optional(),
    uqc: z.enum(["PCS", "BOX", "SET", "KGS", "NOS", "PKT", "DOZ"]).optional(),
    notes: z.string().optional(),
  })
  .superRefine((line, ctx) => {
    const source = line.source ?? "catalogue";
    if (source === "catalogue") {
      if (!line.sku || line.sku.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["sku"], message: "catalogue line requires a sku" });
      }
      if (line.quantity == null) {
        ctx.addIssue({ code: "custom", path: ["quantity"], message: "catalogue line requires a positive quantity" });
      }
    } else {
      if (!line.name || line.name.trim() === "") {
        ctx.addIssue({ code: "custom", path: ["name"], message: `${source} line requires a name` });
      }
      if (line.unitPrice == null) {
        ctx.addIssue({ code: "custom", path: ["unitPrice"], message: `${source} line requires a unitPrice` });
      }
      if (source === "custom" && line.quantity == null) {
        ctx.addIssue({ code: "custom", path: ["quantity"], message: "custom line requires a positive quantity" });
      }
    }
  });

const schema = z.object({
  products: z.array(lineSchema).min(1),
  kitCount: z.number().int().positive(),
  packagingTier: z.enum(["essential", "standard", "premium", "flagship"]),
  rushOrder: z.boolean(),
  rushDays: z.number().int().optional(),
  personalisation: z.enum(["name_only", "name_occasion", "full_personal"]),
  resumeIntelligence: z.boolean(),
});

export async function POST(request: Request) {
  try {
    await requirePlatform("platform.pricing.view", { entity: "pricing", action: "pricing.calculate" });
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid or missing request body." }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const result = await calculatePricing({
      ...parsed.data,
      products: parsed.data.products.map((l) => ({
        sku: l.sku ?? "",
        quantity: l.quantity ?? 1,
        source: l.source,
        name: l.name,
        unitPrice: l.unitPrice,
        gstRate: l.gstRate,
        hsn: l.hsn,
        uqc: l.uqc,
        notes: l.notes,
      })),
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof PricingError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error("[pricing/calculate]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not calculate pricing. Please try again." },
      { status: 500 },
    );
  }
}
