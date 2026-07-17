/**
 * Approval-workflow pure logic (Prompt 7b). NO IO — unit-testable and import-safe.
 *
 * The AUTHORIZATION decision is NEVER re-implemented here: role/limit resolution flows through
 * the pure authorize()/tenantCapability matrix (src/lib/authz/matrix.ts, the P2 `quote.approve`
 * conditional). This module only:
 *   - selects a quote's monetary amount,
 *   - selects the next accountable approver ROLE for an over-limit quote (§7 routing), and
 *   - computes the informational over-budget signal (item 4).
 *
 * DESIGN (Prompt 7b rulings):
 *   1. approval_status is orthogonal to quotes.status. Values: not_required|pending|approved|rejected.
 *   2. Unlimited approvers = finance, org_admin, org_owner. Next approver for an over-limit
 *      hr/manager quote = finance (preferred), else org_admin, else org_owner (always present).
 *      Single hop only (multi-level chains are Enterprise, deferred).
 */

/** Roles that approve with NO limit (matrix cell "Y" for quote.approve). */
export const APPROVAL_UNLIMITED_ROLES = ["finance", "org_admin", "org_owner"] as const;
export type ApprovalRole = (typeof APPROVAL_UNLIMITED_ROLES)[number];

export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

/** Availability of the unlimited-approver roles in a company (active members only). */
export interface ApproverAvailability {
  finance: boolean;
  org_admin: boolean;
  org_owner: boolean;
}

/**
 * The next accountable approver ROLE for an over-limit quote (§7 routing).
 * Preference order: finance -> org_admin -> org_owner. org_owner is guaranteed to exist
 * (one_org_owner_per_company), so this is total — returns null only if given all-false
 * (defensive; should not occur for a real company).
 */
export function selectNextApproverRole(avail: ApproverAvailability): ApprovalRole | null {
  if (avail.finance) return "finance";
  if (avail.org_admin) return "org_admin";
  if (avail.org_owner) return "org_owner";
  return null;
}

/**
 * The quote's monetary amount for the ≤limit conditional and the budget signal.
 * final_total (the computed investment) wins; else total_amount; else null (indeterminate).
 */
export function computeQuoteAmount(q: {
  final_total?: number | null;
  total_amount?: number | null;
}): number | null {
  if (q.final_total != null) return Number(q.final_total);
  if (q.total_amount != null) return Number(q.total_amount);
  return null;
}

/**
 * Over-budget signal (item 4): true IFF a budget is known AND the amount strictly exceeds it.
 * INFORMATIONAL only — never blocks. Unknown amount or unknown budget => not flagged.
 */
export function isOverBudget(amount: number | null, budget: number | null | undefined): boolean {
  if (amount == null) return false;
  if (budget == null) return false;
  return amount > budget;
}

/**
 * Extract the occasion TYPE key from a stable occasion_key
 * (`company:employee:type:date` or `company:cw:type:date:title`). In both shapes the type is
 * segment index 2. Returns null for a null/short key (ad-hoc quotes have no occasion).
 */
export function occasionTypeKeyFromOccasionKey(occasionKey: string | null | undefined): string | null {
  if (!occasionKey) return null;
  const parts = occasionKey.split(":");
  return parts.length >= 3 && parts[2] ? parts[2] : null;
}
