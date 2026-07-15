import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Append-only audit writer (Prompt 2, items 3 & 8).
 *
 * Writes to `audit_log` using the REQUEST-SCOPED client (never the service-role
 * client) — the `audit_log_insert_self` RLS policy requires
 * `actor_user_id = auth.uid()`, and the append-only trigger makes every row
 * immutable. Used to record platform-plane cross-tenant access + impersonation
 * (the `audit: true` decisions from the permission matrix).
 *
 * Role-change and PII-access audits arrive in P3/P4 where those events exist —
 * do NOT fake them here.
 */
export type AuditActorType = "tenant" | "platform" | "system";

export interface AuditEvent {
  /** Machine action key, e.g. "platform.orders.read" / "platform.billing.update". */
  action: string;
  /** The tenant company the cross-tenant access targeted (nullable). */
  companyId?: string | null;
  /** Entity name, e.g. "order", "invoice", "quote". */
  entity?: string | null;
  /** Entity id (string form). */
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * Record an audited action for the current authenticated actor. Best-effort:
 * an audit failure must not silently pass, so it throws — callers wrap the
 * business op so the audit and the access succeed or fail together.
 */
export async function writeAudit(
  actorUserId: string,
  actorType: AuditActorType,
  event: AuditEvent,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_log").insert({
    actor_user_id: actorUserId,
    actor_type: actorType,
    company_id: event.companyId ?? null,
    action: event.action,
    entity: event.entity ?? null,
    entity_id: event.entityId ?? null,
    before: (event.before ?? null) as never,
    after: (event.after ?? null) as never,
  });
  if (error) {
    throw new Error(`audit_log write failed for '${event.action}': ${error.message}`);
  }
}
