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

const productSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  personalisationType: z.string().optional(),
  engravingTextTemplate: z.string().optional(),
  notes: z.string().optional(),
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
    const order = await createOrder(parsed.data, profile.id);
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
