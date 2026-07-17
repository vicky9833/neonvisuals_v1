import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Concierge engine (Prompt 7d) — DB operations for requests, threaded messages, assignment, and
 * status. Routes stay thin (auth + validation + notification); this is the single system of
 * record. Callers pass the appropriate client: the RLS user client for tenant-scoped reads/writes,
 * the service-role admin client for the cross-org ops queue.
 */

export type ConciergeUrgency = "low" | "normal" | "high";
export type ConciergeStatus = "open" | "awaiting_ops" | "awaiting_customer" | "resolved" | "closed";
export const CONCIERGE_STATUSES: ConciergeStatus[] = ["open", "awaiting_ops", "awaiting_customer", "resolved", "closed"];

export interface ConciergeRequestRow {
  id: string;
  company_id: string;
  raised_by: string;
  subject: string;
  body: string;
  urgency: ConciergeUrgency;
  status: ConciergeStatus;
  assigned_staff_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConciergeMessageRow {
  id: string;
  request_id: string;
  sender_user_id: string;
  sender_type: "tenant" | "platform";
  body: string;
  created_at: string;
}

const REQUEST_COLS = "id, company_id, raised_by, subject, body, urgency, status, assigned_staff_id, created_at, updated_at";

/** Tenant raises a request (RLS user client; company_id scoped by the insert policy). */
export async function createConciergeRequest(
  userClient: SupabaseClient,
  input: { companyId: string; raisedBy: string; subject: string; body: string; urgency: ConciergeUrgency },
): Promise<ConciergeRequestRow> {
  const { data, error } = await userClient
    .from("concierge_requests")
    .insert({
      company_id: input.companyId,
      raised_by: input.raisedBy,
      subject: input.subject,
      body: input.body,
      urgency: input.urgency,
      status: "open",
    })
    .select(REQUEST_COLS)
    .single();
  if (error) throw new Error(`createConciergeRequest: ${error.message}`);
  return data as ConciergeRequestRow;
}

/** Load a single request (RLS-scoped: own-company members or platform staff). */
export async function getConciergeRequest(client: SupabaseClient, requestId: string): Promise<ConciergeRequestRow | null> {
  const { data } = await client.from("concierge_requests").select(REQUEST_COLS).eq("id", requestId).maybeSingle();
  return (data as ConciergeRequestRow | null) ?? null;
}

/** Tenant's own-company requests (RLS user client). */
export async function listCompanyConciergeRequests(userClient: SupabaseClient): Promise<ConciergeRequestRow[]> {
  const { data } = await userClient.from("concierge_requests").select(REQUEST_COLS).order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as ConciergeRequestRow[];
}

/** Cross-org ops queue (service-role admin client — sees ALL companies; gate at the route). */
export async function listAllConciergeRequests(
  admin: SupabaseClient,
  opts: { status?: ConciergeStatus } = {},
): Promise<Array<ConciergeRequestRow & { company_name: string | null }>> {
  let q = admin.from("concierge_requests").select(`${REQUEST_COLS}, companies(name)`).order("created_at", { ascending: false }).limit(200);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as unknown as ConciergeRequestRow & { companies?: { name?: string } | null };
    return { ...row, company_name: row.companies?.name ?? null };
  });
}

/** Full thread for a request (RLS-scoped). */
export async function getConciergeThread(client: SupabaseClient, requestId: string): Promise<ConciergeMessageRow[]> {
  const { data } = await client
    .from("concierge_messages")
    .select("id, request_id, sender_user_id, sender_type, body, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ConciergeMessageRow[];
}

/** Append a reply. `senderType` marks tenant vs platform. */
export async function addConciergeMessage(
  client: SupabaseClient,
  input: { requestId: string; senderUserId: string; senderType: "tenant" | "platform"; body: string },
): Promise<ConciergeMessageRow> {
  const { data, error } = await client
    .from("concierge_messages")
    .insert({ request_id: input.requestId, sender_user_id: input.senderUserId, sender_type: input.senderType, body: input.body })
    .select("id, request_id, sender_user_id, sender_type, body, created_at")
    .single();
  if (error) throw new Error(`addConciergeMessage: ${error.message}`);
  // Advance status: a tenant reply -> awaiting_ops; an ops reply -> awaiting_customer (non-terminal only).
  const nextStatus = input.senderType === "tenant" ? "awaiting_ops" : "awaiting_customer";
  await client.from("concierge_requests").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", input.requestId).in("status", ["open", "awaiting_ops", "awaiting_customer"]);
  return data as ConciergeMessageRow;
}

/** Assign a request to a platform staffer (Pro tier; gate at the route). */
export async function assignConciergeRequest(admin: SupabaseClient, requestId: string, staffUserId: string | null): Promise<void> {
  const { error } = await admin.from("concierge_requests").update({ assigned_staff_id: staffUserId, updated_at: new Date().toISOString() }).eq("id", requestId);
  if (error) throw new Error(`assignConciergeRequest: ${error.message}`);
}

/** Set request status (e.g. resolved/closed). */
export async function setConciergeStatus(client: SupabaseClient, requestId: string, status: ConciergeStatus): Promise<void> {
  const { error } = await client.from("concierge_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", requestId);
  if (error) throw new Error(`setConciergeStatus: ${error.message}`);
}
