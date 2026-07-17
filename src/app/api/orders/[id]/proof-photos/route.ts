import { NextResponse } from "next/server";
import { requireApiAuth, requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanUploadOrThrow } from "@/lib/employees/upload-scan";
import { validateProofImage, PROOF_MAX_PER_ORDER, PROOF_MAX_BYTES } from "@/lib/services/image-validate";
import { uploadProofPhoto, countProofPhotos, listProofPhotoRows, signProofUrls } from "@/lib/services/proof-photos";

export const runtime = "nodejs";

/**
 * POST /api/orders/[id]/proof-photos — OPS uploads a proof photo (Prompt 7c-rest item 1).
 * requirePlatform("platform.orders.manage") (owner/admin/ops). Server-side content validation by
 * MAGIC BYTES (not extension), size cap, per-order count cap. The scan-seam is wired ON THIS LIVE
 * PERSIST PATH (no-op today; async scanner = elevated P10). All errors are by-reference.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requirePlatform("platform.orders.manage", { entity: "order", action: "order.proof_photos.upload" });
    const { id: orderId } = await params;
    const admin = createAdminClient();

    const { data: order } = await admin.from("orders").select("id, company_id").eq("id", orderId).maybeSingle();
    if (!order?.company_id) return NextResponse.json({ error: "not_found", message: "Order not found." }, { status: 404 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "bad_request", message: "No file provided." }, { status: 400 });
    if (file.size > PROOF_MAX_BYTES) return NextResponse.json({ error: "too_large", message: "File exceeds the 10MB limit." }, { status: 413 });

    const existing = await countProofPhotos(admin, orderId);
    if (existing >= PROOF_MAX_PER_ORDER) return NextResponse.json({ error: "too_many", message: `At most ${PROOF_MAX_PER_ORDER} proof photos per order.` }, { status: 422 });

    const bytes = await file.arrayBuffer();
    // SECURITY: validate by content bytes — a renamed non-image is rejected here.
    const v = validateProofImage(bytes);
    if (!v.ok) return NextResponse.json({ error: "invalid_image", reason: v.code, message: "File is not a valid JPEG/PNG/WebP image." }, { status: 422 });

    // Scan-seam on the LIVE persist path (no-op today; async malware scan = elevated P10).
    await scanUploadOrThrow(bytes, file.name);

    const { id } = await uploadProofPhoto(admin, {
      orderId,
      companyId: order.company_id as string,
      bytes,
      mime: v.mime,
      uploadedBy: principal.id,
    });
    return NextResponse.json({ data: { id, order_id: orderId } }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/proof-photos POST]"); // never log payload
    return NextResponse.json({ error: "server_error", message: "Upload failed." }, { status: 500 });
  }
}

/**
 * GET /api/orders/[id]/proof-photos — view proof photos as short-TTL SIGNED URLs.
 * Any authenticated member of the order's company (RLS own-company) or platform staff. Never
 * returns public bucket URLs. No employee PII in paths/URLs.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireApiAuth();
    const { id: orderId } = await params;
    const userClient = await createClient();
    // RLS-scoped: a tenant of another company gets zero rows (own-company isolation).
    const rows = await listProofPhotoRows(userClient, orderId);
    if (rows.length === 0) {
      // Distinguish "no access / no photos" without leaking existence across companies.
      return NextResponse.json({ data: { photos: [] } });
    }
    // Ownership double-check (belt & braces alongside RLS).
    const foreign = rows.some((r) => r.company_id !== principal.company_id && !principal.isPlatformStaff);
    if (foreign) return NextResponse.json({ data: { photos: [] } });

    const admin = createAdminClient();
    const urls = await signProofUrls(admin, rows.map((r) => r.storage_path));
    const photos = rows.map((r, i) => ({ id: r.id, url: urls[i] ?? null, content_type: r.content_type, created_at: r.created_at }));
    return NextResponse.json({ data: { photos } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/proof-photos GET]", err);
    return NextResponse.json({ error: "server_error", message: "Could not load proof photos." }, { status: 500 });
  }
}
