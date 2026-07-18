import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiPrincipal } from "@/lib/api-auth";
import { tenantCapability } from "@/lib/api-auth";
import { canUseApprovals } from "@/lib/employees/plan-gate";
import {
  notify,
  NOTIFICATION_TYPES,
  clearGiftChosenForQuote,
} from "@/lib/engines/notifications";
import {
  selectNextApproverRole,
  computeQuoteAmount,
  type ApprovalRole,
  type ApproverAvailability,
} from "@/lib/engines/approval-workflow";
import { env } from "@/lib/env";

/**
 * Approval-service orchestration (Prompt 7b, item 2 + item 3). Server-only (engine layer).
 *
 * The P2 obligation lands here: the quote.approve matrix conditional (≤limit) is FINALLY invoked
 * via tenantCapability(principal, "quote.approve", companyId, { amount }). The route is a thin
 * controller; this helper decides + mutates.
 *
 * Branching (never re-implements the matrix decision — only classifies it):
 *   allow                              -> approve (or, for reject action, reject)
 *   deny + conditional at-most-limit   -> OVER-LIMIT routing to the next approver (§7)
 *   deny (viewer "N" / no membership)  -> forbidden (403)
 *
 * Pro-gate (§8, decision 3): a Free company has NO approval workflow. That is a NON-ERROR
 * "not_applicable" outcome — the quote proceeds via the existing ungated path — NOT a 403.
 * Platform staff / plan override bypass (canUseApprovals).
 */

interface QuoteRow {
  id: string;
  company_id: string | null;
  status: string | null;
  approval_status: string | null;
  final_total: number | null;
  total_amount: number | null;
  quote_number: string | null;
  occasion_key: string | null;
}

export type ApprovalOutcome =
  | { kind: "approved" }
  | { kind: "rejected"; giftCleared: number }
  | { kind: "routed"; routedTo: ApprovalRole; notified: number; emailed: number; emailFailed: boolean }
  | { kind: "not_applicable"; reason: string }
  | { kind: "no_approver" }
  | { kind: "forbidden"; reason: string }
  | { kind: "not_found" };

const QUOTE_SELECT =
  "id, company_id, status, approval_status, final_total, total_amount, quote_number, occasion_key";

/** ₹ formatting for the reference-style notification (amount is not PII). */
function formatAmount(amount: number | null): string {
  if (amount == null) return "an unspecified amount";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Active-member availability for the unlimited-approver roles (for §7 routing). */
async function approverAvailability(
  admin: SupabaseClient,
  companyId: string,
): Promise<ApproverAvailability> {
  const { data } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("status", "active")
    .in("role", ["finance", "org_admin", "org_owner"]);
  const roles = new Set((data ?? []).map((r) => r.role as string));
  return {
    finance: roles.has("finance"),
    org_admin: roles.has("org_admin"),
    org_owner: roles.has("org_owner"),
  };
}

/** Active user_ids for a given approver role (notification recipients). */
async function userIdsForRole(
  admin: SupabaseClient,
  companyId: string,
  role: ApprovalRole,
): Promise<string[]> {
  const { data } = await admin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", role)
    .eq("status", "active");
  return (data ?? []).map((r) => r.user_id as string);
}

/**
 * Process an approve/reject decision on a quote. `userClient` is the caller's RLS-scoped client
 * (loads/updates the quote within their company — tenant isolation); `admin` is service-role for
 * the cross-member notification + the 7a gift-state reversal (system signals).
 */
export async function processApproval(params: {
  userClient: SupabaseClient;
  admin: SupabaseClient;
  principal: ApiPrincipal;
  quoteId: string;
  action: "approve" | "reject";
}): Promise<ApprovalOutcome> {
  const { userClient, admin, principal, quoteId, action } = params;

  // Load the quote RLS-scoped: absent => not in the caller's company (404).
  const { data: quote } = await userClient
    .from("quotes")
    .select(QUOTE_SELECT)
    .eq("id", quoteId)
    .maybeSingle<QuoteRow>();
  if (!quote || !quote.company_id) return { kind: "not_found" };
  const companyId = quote.company_id;

  // Pro-gate BEFORE any mutation. Free => not_applicable (non-error), quote proceeds ungated.
  const { data: company } = await admin
    .from("companies")
    .select("name, plan, plan_status, plan_override_by, is_demo")
    .eq("id", companyId)
    .maybeSingle();
  const gate = canUseApprovals({
    plan: (company?.plan as string | null) ?? null,
    planStatus: (company?.plan_status as string | null) ?? null,
    planOverrideBy: (company?.plan_override_by as string | null) ?? null,
    isDemo: (company?.is_demo as boolean | null) ?? false,
    isPlatformStaff: principal.isPlatformStaff,
  });
  if (!gate.allowed) return { kind: "not_applicable", reason: gate.reason };

  const amount = computeQuoteAmount(quote);

  // THE P2 CONDITIONAL — the quote.approve ≤limit matrix cell, finally invoked with the amount.
  const decision = tenantCapability(principal, "quote.approve", companyId, {
    amount: amount ?? undefined,
  });

  // ── REJECT ────────────────────────────────────────────────────────────────
  if (action === "reject") {
    if (decision.effect !== "allow") {
      return { kind: "forbidden", reason: decision.reason ?? "Not permitted to reject." };
    }
    const { error } = await userClient
      .from("quotes")
      .update({ approval_status: "rejected", approved_by: null, approved_at: null })
      .eq("id", quoteId);
    if (error) return { kind: "forbidden", reason: error.message };
    // 7a EXACT reversal: rejected + no linked order => clear gift-state so escalation resumes.
    const { cleared } = await clearGiftChosenForQuote(admin, quoteId);
    return { kind: "rejected", giftCleared: cleared };
  }

  // ── APPROVE (allow) ─────────────────────────────────────────────────────────
  if (decision.effect === "allow") {
    const { error } = await userClient
      .from("quotes")
      .update({
        approval_status: "approved",
        approved_by: principal.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", quoteId);
    if (error) return { kind: "forbidden", reason: error.message };
    return { kind: "approved" };
  }

  // ── OVER-LIMIT (hr/manager, at-most-limit deny) -> route to the next approver (§7) ──
  if (decision.conditional === "at-most-limit") {
    const avail = await approverAvailability(admin, companyId);
    const routedTo = selectNextApproverRole(avail);
    if (!routedTo) return { kind: "no_approver" };

    const { error } = await userClient
      .from("quotes")
      .update({
        approval_status: "pending",
        approval_routed_to: routedTo,
        approved_by: null,
        approved_at: null,
      })
      .eq("id", quoteId);
    if (error) return { kind: "forbidden", reason: error.message };

    // Notify the next-approver role. PII-SAFE (§10.13): org + amount + quote reference only.
    // Deep link carries ONLY the quote id (not PII) -> the approval view's Approve/Reject actions.
    const orgName = (company?.name as string) ?? "your organisation";
    const amountLabel = formatAmount(amount);
    const ref = quote.quote_number ?? quote.id;
    const link = `${env.appUrl}/dashboard/quotes/approvals?quote=${quote.id}`;
    const recipients = await userIdsForRole(admin, companyId, routedTo);

    let notified = 0;
    let emailed = 0;
    try {
      const res = await notify(admin, {
        type: NOTIFICATION_TYPES.QUOTE_APPROVAL_ROUTED,
        recipients,
        companyId,
        title: `Quote approval needed — ${orgName}`,
        body: `Quote ${ref} (${amountLabel}) needs your approval.`,
        link,
        dedupeKey: `qapp:${quote.id}`,
        email: {
          subject: `Quote approval needed — ${orgName}`,
          html:
            `<p>A quote for <strong>${orgName}</strong> needs your approval.</p>` +
            `<p>Reference: ${ref}<br/>Amount: ${amountLabel}</p>` +
            `<p><a href="${link}">Review to Approve or Reject</a></p>`,
          template: "quote_approval_routed",
        },
      });
      notified = res.inApp;
      emailed = res.emailed;
    } catch (e) {
      console.error("[approval-service] routing notify failed:", e);
    }
    // Email delivery is best-effort; in-app is the durable signal. Keep pending regardless.
    return { kind: "routed", routedTo, notified, emailed, emailFailed: emailed === 0 };
  }

  // Viewer ("N"), wrong plane, or no membership => hard forbidden.
  return { kind: "forbidden", reason: decision.reason ?? "Not permitted." };
}
