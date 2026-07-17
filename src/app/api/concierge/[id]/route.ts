import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConciergeRequest, getConciergeThread } from "@/lib/engines/concierge";
import { listAttachmentRows, signAttachmentUrls } from "@/lib/services/concierge-attachments";

export const runtime = "nodejs";

/**
 * GET /api/concierge/[id] — request + full thread + attachments (scoped signed URLs).
 * RLS-scoped: own-company members or platform staff. Another company sees nothing (404).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const userClient = await createClient();
    const req = await getConciergeRequest(userClient, id);
    if (!req) return NextResponse.json({ error: "not_found", message: "Request not found." }, { status: 404 });

    const [thread, attachmentRows] = await Promise.all([
      getConciergeThread(userClient, id),
      listAttachmentRows(userClient, id),
    ]);
    const urls = attachmentRows.length ? await signAttachmentUrls(createAdminClient(), attachmentRows.map((a) => a.storage_path)) : [];
    const attachments = attachmentRows.map((a, i) => ({ id: a.id, url: urls[i] ?? null, content_type: a.content_type, created_at: a.created_at }));

    return NextResponse.json({ data: { request: req, thread, attachments } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[concierge/[id] GET]", err);
    return NextResponse.json({ error: "server_error", message: "Could not load the request." }, { status: 500 });
  }
}
