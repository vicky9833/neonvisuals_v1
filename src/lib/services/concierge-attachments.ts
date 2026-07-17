import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONCIERGE_EXT, type ConciergeMime } from "./image-validate";

/**
 * Concierge attachment storage (Prompt 7d). PRIVATE bucket `concierge-attachments`; TENANT-uploaded
 * (widest threat surface) — the upload route validates by magic bytes (images + PDF only) and runs
 * the scan-seam before calling this. Served via short-TTL signed URLs (never public). Storage path
 * carries NO PII: {company_id}/{request_id}/{uuid}.{ext}.
 */
export const CONCIERGE_BUCKET = "concierge-attachments";
export const CONCIERGE_URL_TTL_SECONDS = 300;

export interface ConciergeAttachmentRow {
  id: string;
  request_id: string;
  company_id: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export async function countAttachments(admin: SupabaseClient, requestId: string): Promise<number> {
  const { count } = await admin
    .from("concierge_attachments")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId);
  return count ?? 0;
}

/** Persist a validated attachment: upload bytes to the private bucket, then insert metadata. */
export async function uploadConciergeAttachment(
  admin: SupabaseClient,
  input: { requestId: string; companyId: string; bytes: ArrayBuffer; mime: ConciergeMime; uploadedBy: string | null },
): Promise<{ id: string; storagePath: string }> {
  const path = `${input.companyId}/${input.requestId}/${randomUUID()}.${CONCIERGE_EXT[input.mime]}`;
  const { error: upErr } = await admin.storage
    .from(CONCIERGE_BUCKET)
    .upload(path, input.bytes, { contentType: input.mime, upsert: false });
  if (upErr) throw new Error(`concierge upload failed: ${upErr.message}`);

  const { data, error } = await admin
    .from("concierge_attachments")
    .insert({
      request_id: input.requestId,
      company_id: input.companyId,
      storage_path: path,
      content_type: input.mime,
      size_bytes: input.bytes.byteLength,
      uploaded_by: input.uploadedBy,
    })
    .select("id")
    .single();
  if (error) {
    await admin.storage.from(CONCIERGE_BUCKET).remove([path]).catch(() => {});
    throw new Error(`concierge attachment insert failed: ${error.message}`);
  }
  return { id: data.id as string, storagePath: path };
}

export async function listAttachmentRows(client: SupabaseClient, requestId: string): Promise<ConciergeAttachmentRow[]> {
  const { data } = await client
    .from("concierge_attachments")
    .select("id, request_id, company_id, storage_path, content_type, size_bytes, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ConciergeAttachmentRow[];
}

export async function signAttachmentUrls(admin: SupabaseClient, paths: string[], ttl = CONCIERGE_URL_TTL_SECONDS): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data } = await admin.storage.from(CONCIERGE_BUCKET).createSignedUrls(paths, ttl);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
}
