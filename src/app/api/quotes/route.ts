import { NextResponse } from "next/server";
import { z } from "zod";
import { createQuote, listQuotes, type QuoteStatus } from "@/lib/engines/quote";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";

// Quotes are internal - super_admin only (Neon Visuals team).
export const runtime = "nodejs";

const quoteSchema = z.object({
  clientName: z.string().min(1),
  clientCompany: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(1),
  occasion: z.string().min(1),
  products: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })).min(1),
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
    await requireApiRole(["super_admin"]);
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid or missing request body." }, { status: 400 });
    }
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.message }, { status: 400 });
    }
    const quote = await createQuote(parsed.data);
    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not save the quote. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    await requireApiRole(["super_admin"]);
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
