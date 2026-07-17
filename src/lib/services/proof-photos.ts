import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROOF_EXT, type ProofImageMime } from "./image-validate";

/**
 * Proof-photo storage service (Prompt 7c-rest item 1). PRIVATE bucket `order-proofs`; ops upload
 * via the service-role client; tenants view via short-TTL signed URLs (never public URLs). The
 * storage path carries NO employee PII: {company_id}/{order_id}/{uuid}.{ext}.
 */
export const PROOF_BUCKET = "order-proofs";
export const PROOF_URL_TTL_SECONDS = 300;

export interface ProofPhotoRow {
  id: string;
  order_id: string;
  company_id: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

/** Count existing proof photos for an order (for the per-order count cap). */
export async function countProofPhotos(admin: SupabaseClient, orderId: string): Promise<number> {
  const { count } = await admin
    .from("order_proof_photos")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  return count ?? 0;
}

/**
 * Persist a validated proof image: upload bytes to the private bucket, then insert the metadata
 * row. `admin` MUST be the service-role client. Returns the new row id + storage path.
 */
export async function uploadProofPhoto(
  admin: SupabaseClient,
  input: { orderId: string; companyId: string; bytes: ArrayBuffer; mime: ProofImageMime; uploadedBy: string | null },
): Promise<{ id: string; storagePath: string }> {
  const path = `${input.companyId}/${input.orderId}/${randomUUID()}.${PROOF_EXT[input.mime]}`;
  const { error: upErr } = await admin.storage
    .from(PROOF_BUCKET)
    .upload(path, input.bytes, { contentType: input.mime, upsert: false });
  if (upErr) throw new Error(`proof upload failed: ${upErr.message}`);

  const { data, error } = await admin
    .from("order_proof_photos")
    .insert({
      order_id: input.orderId,
      company_id: input.companyId,
      storage_path: path,
      content_type: input.mime,
      size_bytes: input.bytes.byteLength,
      uploaded_by: input.uploadedBy,
    })
    .select("id")
    .single();
  if (error) {
    // Roll back the orphan object so a failed insert never leaves a dangling file.
    await admin.storage.from(PROOF_BUCKET).remove([path]).catch(() => {});
    throw new Error(`proof insert failed: ${error.message}`);
  }
  return { id: data.id as string, storagePath: path };
}

/** List proof-photo metadata rows for an order. `client` scopes via RLS (own-company or platform). */
export async function listProofPhotoRows(client: SupabaseClient, orderId: string): Promise<ProofPhotoRow[]> {
  const { data } = await client
    .from("order_proof_photos")
    .select("id, order_id, company_id, storage_path, content_type, size_bytes, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ProofPhotoRow[];
}

/** Generate short-TTL signed URLs for storage paths (service-role). Never returns public URLs. */
export async function signProofUrls(
  admin: SupabaseClient,
  paths: string[],
  ttl: number = PROOF_URL_TTL_SECONDS,
): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data } = await admin.storage.from(PROOF_BUCKET).createSignedUrls(paths, ttl);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
}

/** Delete proof objects + rows for an order (teardown / order removal). */
export async function deleteProofPhotos(admin: SupabaseClient, orderId: string): Promise<void> {
  const rows = await listProofPhotoRows(admin, orderId);
  const paths = rows.map((r) => r.storage_path);
  if (paths.length > 0) await admin.storage.from(PROOF_BUCKET).remove(paths).catch(() => {});
  await admin.from("order_proof_photos").delete().eq("order_id", orderId);
}
