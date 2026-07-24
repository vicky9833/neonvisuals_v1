import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requirePlatform,
  auditCrossTenantAccess,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import {
  createOrder,
  listOrders,
  toClientOrder,
  type OrderStatus,
} from "@/lib/engines/order";
import { PricingError } from "@/lib/engines/pricing";
import { QuoteValidationError } from "@/lib/engines/quote";

export const runtime = "nodejs";

// Phase 5B: catalogue | custom | charge lines. A typed unit price is REQUIRED on EVERY line
// (prices are manual). REJECTS: custom/charge without name; bad gstRate; hsn not 4-8 digits;
// non-positive quantity/unitPrice.
const gstRateSchema = z
  .number()
  .refine((v) => [0, 0.25, 3, 5, 12, 18, 28].includes(v), {
    message: "gstRate must be one of 0, 0.25, 3, 5, 12, 18, 28",
  });

const productSchema = z
  .object({
    sku: z.string().optional(),
    source: z.enum(["catalogue", "custom", "charge"]).optional(),
    name: z.string().optional(),
    unitPrice: z.number().positive("unitPrice must be a number greater than 0"),
    quantity: z.number().int().positive("quantity must be a positive integer").optional(),
    gstRate: gstRateSchema.optional(),
    hsn: z.string().regex(/^\d{4,8}$/, "hsn must be 4-8 digits").optional(),
    uqc: z.enum(["PCS", "BOX", "SET", "KGS", "NOS", "PKT", "DOZ"]).optional(),
    personalisationType: z.string().optional(),
    engravingTextTemplate: z.string().optional(),
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
      if (source === "custom" && line.quantity == null) {
        ctx.addIssue({ code: "custom", path: ["quantity"], message: "custom line requires a positive quantity" });
      }
    }
  });

const createSchema = z.object({
  companyId: z.string().uuid(),
  quoteId: z.string().uuid().optional(),
  occasionType: z.string().optional(),
  occasionLabel: z.string().optional(),
  products: z.array(productSchema).min(1),
  packagingTier: z.enum(["essential", "standard", "premium", "flagship"]),
  personalisationLevel: z.enum(["name_only", "name_occasion", "full_personal"]),
  kitCount: z.number().int().positive(),
  isRush: z.boolean().optional(),
  rushDays: z.number().int().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryPincode: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  internalNotes: z.string().optional(),
  clientNotes: z.string().optional(),
  specialInstructions: z.string().optional(),
});

// POST - create an order (super_admin only).
export async function POST(request: Request) {
  try {
    const profile = await requirePlatform("platform.orders.manage", {
      entity: "order",
      action: "order.create",
    });
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid or missing request body." },
        { status: 400 },
      );
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const order = await createOrder(
      {
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
          personalisationType: l.personalisationType,
          engravingTextTemplate: l.engravingTextTemplate,
          notes: l.notes,
        })),
      },
      profile.id,
    );
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    // Fail-loud pricing errors (e.g. unknown SKU) are client-actionable -> 400 (not 500).
    if (err instanceof PricingError || err instanceof QuoteValidationError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    console.error("[orders]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not create the order. Please try again." },
      { status: 500 },
    );
  }
}

// GET - list orders. Admin: all (full data). Client: own company only, no pricing.
export async function GET(request: Request) {
  try {
    const profile = await requireApiAuth();
    const { searchParams } = new URL(request.url);
    const isAdmin = profile.isPlatformStaff;

    if (!isAdmin && !profile.company_id) {
      return NextResponse.json({ data: { orders: [], total: 0 } });
    }
    if (isAdmin) {
      // Former super_admin cross-tenant override → platform authorize() + audit.
      await auditCrossTenantAccess(profile, "platform.orders.manage", {
        entity: "order",
        action: "order.list",
        companyId: searchParams.get("companyId"),
      });
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const result = await listOrders({
      companyId: isAdmin
        ? (searchParams.get("companyId") ?? undefined)
        : profile.company_id!,
      status: (searchParams.get("status") as OrderStatus) ?? undefined,
      search: searchParams.get("search") ?? undefined,
      dateRange: from && to ? { start: from, end: to } : undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    });

    if (isAdmin) {
      return NextResponse.json({ data: result });
    }
    return NextResponse.json({
      data: { orders: result.orders.map(toClientOrder), total: result.total },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load orders. Please try again." },
      { status: 500 },
    );
  }
}
