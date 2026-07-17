import { NextResponse } from "next/server";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listProofPhotoRows, signProofUrls } from "@/lib/services/proof-photos";
import { notifyProofPhotosReady } from "@/lib/engines/notifications";

export const runtime = "nodejs";

/**
 * POST /api/orders/[id]/proof-photos/ready — OPS marks proof photos ready (Prompt 7c-rest item 2).
 * Sets orders.proof_photos_ready = true (SOFT before-dispatch flag — does NOT block the shipped
 * transition) and fires the §7 hr/org_admin notification (in-app + email with SCOPED signed image
 * URLs; PII-safe subject/link). requirePlatform("platform.orders.manage").
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatform("platform.orders.manage", { entity: "order", action: "order.proof_photos.ready" });
    const { id: orderId } = await params;
    const admin = createAdminClient();

    const { data: order } = await admin.from("orders").select("id, company_id, order_number").eq("id", orderId).maybeSingle();
    if (!order?.company_id) return NextResponse.json({ error: "not_found", message: "Order not found." }, { status: 404 });

    const rows = await listProofPhotoRows(admin, orderId);
    if (rows.length === 0) return NextResponse.json({ error: "no_photos", message: "Upload proof photos before marking ready." }, { status: 422 });

    await admin.from("orders").update({ proof_photos_ready: true }).eq("id", orderId);

    const imageUrls = await signProofUrls(admin, rows.map((r) => r.storage_path));
    const res = await notifyProofPhotosReady(admin, {
      orderId,
      companyId: order.company_id as string,
      orderNumber: (order.order_number as string | null) ?? null,
      imageUrls,
    });
    return NextResponse.json({ data: { proof_photos_ready: true, notified: res.inApp, emailed: res.emailed } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/proof-photos/ready]", err);
    return NextResponse.json({ error: "server_error", message: "Could not mark proof photos ready." }, { status: 500 });
  }
}
