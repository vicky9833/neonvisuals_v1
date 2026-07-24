import { NextResponse } from "next/server";
import { z } from "zod";
import { createQuote, listQuotes, QuoteValidationError, type QuoteStatus } from "@/lib/engines/quote";
import { PricingError } from "@/lib/engines/pricing";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";

// Quotes are internal - super_admin only (Neon Visuals team).
export const runtime = "nodejs";

// Phase 5A line schema: catalogue (default) | custom | charge. New fields optional; a bare
// { sku, quantity } is a catalogue line. REJECTS: custom/charge without name or unitPrice; a
// gstRate outside the allowed set; an hsn that is not 4-8 digits; non-positive quantity/unitPrice.
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

const quoteSchema = z.object({
  clientName: z.string().min(1),
  clientCompany: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(1),
  occasion: z.string().min(1),
  products: z.array(lineSchema).min(1),
  packagingTier: z.enum(["essential", "standard", "premium", "flagship"]),
  personalisation: z.enum(["name_only", "name_occasion", "full_personal"]),
  resumeIntelligence: z.boolean().default(false),
  rushOrder: z.boolean().default(false),
  rushDays: z.number().int().optional(),
  timeline: z.string().optional(),
  sampleMessage: z.string().optional(),
  specialInstructions: z.string().optional(),
  kitCount: z.number().int().positive(),
  validityDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountReason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requirePlatform("platform.billing.manage", { entity: "quote", action: "quote.create" });
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid or missing request body." }, { status: 400 });
    }
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const quote = await createQuote({
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
    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    if (err instanceof PricingError || err instanceof QuoteValidationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error("[quotes]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not save the quote. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await requirePlatform("platform.billing.manage", { entity: "quote", action: "quote.list" });
    const { searchParams } = new URL(request.url);
    const quotes = await listQuotes({
      status: (searchParams.get("status") as QuoteStatus) ?? undefined,
      clientCompany: searchParams.get("company") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ data: quotes });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load quotes. Please try again." },
      { status: 500 },
    );
  }
}
