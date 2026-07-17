import { NextResponse } from "next/server";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConciergeRequest } from "@/lib/engines/concierge";
import { scanUploadOrThrow } from "@/lib/employees/upload-scan";
import { validateConciergeAttachment, CONCIERGE_MAX_BYTES, CONCIERGE_MAX_PER_REQUEST } from "@/lib/services/image-validate";
import { uploadConciergeAttachment, countAttachments } from "@/lib/services/concierge-attachments";

export const runtime = "nodejs";

/**
 * POST /api/concierge/[id]/attachments — TENANT uploads an attachment (§10 tenant-upload path).
 * Gated by `concierge.raise` + own-company. Validated by MAGIC BYTES: images + PDF ONLY — office/
 * macro formats and renamed non-image/pdf files are REJECTED by content. Scan-seam on the live
 * persist path (no-op today; the HIGHEST-priority P10 async-scanner path). By-reference errors.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireTenant("concierge.raise", null);
    const { id } = await params;
    const userClient = await createClient();
    const req = await getConciergeRequest(userClient, id);
    if (!req || req.company_id !== principal.company_id) return NextResponse.json({ error: "not_found", message: "Request not found." }, { status: 404 });

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "bad_request", message: "No file provided." }, { status: 400 });
    if (file.size > CONCIERGE_MAX_BYTES) return NextResponse.json({ error: "too_large", message: "File exceeds the 15MB limit." }, { status: 413 });

    const admin = createAdminClient();
    if ((await countAttachments(admin, id)) >= CONCIERGE_MAX_PER_REQUEST) {
      return NextResponse.json({ error: "too_many", message: `At most ${CONCIERGE_MAX_PER_REQUEST} attachments per request.` }, { status: 422 });
    }

    const bytes = await file.arrayBuffer();
    // SECURITY: content validation — images + PDF only; office/macro + renamed non-image/pdf rejected.
    const v = validateConciergeAttachment(bytes);
    if (!v.ok) return NextResponse.json({ error: "invalid_attachment", reason: v.code, message: "Only image (JPEG/PNG/WebP) or PDF files are accepted." }, { status: 422 });

    // Scan-seam on the LIVE persist path (no-op today; external tenant upload = highest-priority P10).
    await scanUploadOrThrow(bytes, file.name);

    const { id: attachmentId } = await uploadConciergeAttachment(admin, {
      requestId: id, companyId: req.company_id, bytes, mime: v.mime, uploadedBy: principal.id,
    });
    return NextResponse.json({ data: { id: attachmentId, content_type: v.mime } }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[concierge/[id]/attachments POST]"); // never log payload
    return NextResponse.json({ error: "server_error", message: "Upload failed." }, { status: 500 });
  }
}
