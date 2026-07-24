import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrder } from "@/lib/services/razorpay";
import { createSubscriptionInvoice } from "@/lib/engines/billing";
import { saveInvoicePDF } from "@/lib/engines/invoice-pdf";
import { notifyPaymentReceived } from "@/lib/engines/notifications";
import { sendNotificationEmail } from "@/lib/services/email";
import { roundGrandTotalToRupee } from "@/lib/gst";

/** Canonical plan lifecycle states (companies.plan_status gate source-of-truth, §8c-i). */
export type PlanStatus = "active" | "past_due" | "lapsed";

/** Canonical plan_status -> existing subscriptions.status enum (no enum migration). */
const SUB_STATUS_FOR: Record<PlanStatus, string> = {
  active: "active",
  past_due: "past_due",
  lapsed: "cancelled",
};

/**
 * The SINGLE lifecycle writer (service-role choke point). Wraps the atomic
 * `transition_plan_status` SQL function so BOTH the billing cron and the webhook write
 * companies.plan_status + subscriptions.status + current_period_end (+ lapsed_at) consistently,
 * in one transaction. companies.plan is only ever set to 'pro' (activatePro) — never downgraded.
 */
export async function transitionPlanStatus(
  admin: SupabaseClient,
  input: {
    companyId: string;
    toStatus: PlanStatus;
    subscriptionId?: string | null;
    periodEnd?: string | null;
    lapsedAt?: string | null;
    activatePro?: boolean;
  },
): Promise<void> {
  const { error } = await admin.rpc("transition_plan_status", {
    p_company_id: input.companyId,
    p_plan_status: input.toStatus,
    p_sub_status: SUB_STATUS_FOR[input.toStatus],
    p_subscription_id: input.subscriptionId ?? null,
    p_period_end: input.periodEnd ?? null,
    p_lapsed_at: input.lapsedAt ?? null,
    p_activate_pro: input.activatePro ?? false,
  });
  if (error) throw new Error(`transition_plan_status failed: ${error.message}`);
}

/**
 * Subscription Engine — INTERNAL USE ONLY (server-side).
 *
 * Owns the Pro-subscription checkout + activation logic (Prompt 8a). The
 * integrity rule: a company is set Pro ONLY by {@link activateSubscriptionFromWebhook},
 * which runs behind the signature-verified, idempotent Razorpay webhook — never
 * from a client claim. The tenant-facing {@link createProCheckout} only creates
 * a `created` (not-yet-active) subscription row + a Razorpay order; it grants
 * nothing until money is confirmed via the webhook.
 *
 * TEST-MODE: `createOrder` runs against whatever Razorpay key mode is configured.
 * With TEST keys the order is a test-mode order (no real money moves).
 */

/**
 * Pro plan price — the model stated plainly: base + GST (Phase 6).
 *
 * The advertised price is the PRE-TAX base of Rs 1,999 (199900 paise). GST is charged IN ADDITION
 * (Route B, explicit additive) at 18%. The CHARGED amount is DERIVED, never hardcoded: base + GST,
 * with the grand total rounded to the nearest rupee per Section 170 of the CGST Act (half-up), using
 * the same {@link roundGrandTotalToRupee} the invoice path uses. It evaluates to 235900 paise
 * (Rs 2,359.00). See {@link deriveChargedPaise}; asserted at 235900 in the tests.
 *
 * We reuse the gst service for the legally-critical Section-170 rounding. The additive GST amount
 * itself is explicit integer arithmetic (single rate, integer base) rather than a computeGst() call,
 * because computeGst() requires a place-of-supply state + seller registration context that is
 * inappropriate to bind into a module-level constant — and the CHARGED total is supply-type
 * invariant anyway (total tax and grand total are identical intra- vs inter-state).
 */
export const PRO_PRICE_BASE_PAISE = 199900; // pre-tax base — the advertised Rs 1,999
export const PRO_GST_RATE_PERCENT = 18;

/** base + GST(base) with the grand total finalised by Section-170 half-up rounding. */
function deriveChargedPaise(basePaise: number, gstRatePercent: number): number {
  // Additive GST on an integer base at a single rate, half-up (matches the gst service's per-line
  // roundHalfUp for non-negative values): floor(x + 0.5).
  const gstPaise = Math.floor((basePaise * gstRatePercent) / 100 + 0.5); // 199900 * 18% = 35982
  const { grandTotalPaise } = roundGrandTotalToRupee(basePaise + gstPaise); // 235882 -> 235900 (+18)
  return grandTotalPaise;
}

/** CHARGED all-in amount in paise (base + GST, Section-170 rounded). Derived; equals 235900. */
export const PRO_PRICE_CHARGED_PAISE = deriveChargedPaise(PRO_PRICE_BASE_PAISE, PRO_GST_RATE_PERCENT);
export const PRO_CURRENCY = "INR";
export const PRO_INTERVAL = "annual";

export interface ProCheckoutResult {
  subscriptionId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  /** PUBLIC Razorpay key id (safe to hand to the client for Checkout.js). */
  keyId: string;
}

/**
 * Tenant self-serve Pro checkout. Inserts a `created` subscription row (via the
 * request-scoped RLS client — the caller's own company), creates a test-mode
 * Razorpay order, and stores the order id back on the row (via the elevated
 * admin client, since `subscriptions_update` is platform-only). Returns the
 * handle the client needs to open Razorpay Checkout. Grants NO plan change.
 */
export async function createProCheckout(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  input: { companyId: string; createdBy: string },
): Promise<ProCheckoutResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("Razorpay is not configured.");

  // 1) Create the pending subscription row (RLS: own-company insert).
  const { data: subRow, error: insErr } = await userClient
    .from("subscriptions")
    .insert({
      company_id: input.companyId,
      plan: "pro",
      amount: PRO_PRICE_CHARGED_PAISE, // CHARGED all-in (base + GST, Section-170 rounded) = 235900
      base_amount: PRO_PRICE_BASE_PAISE, // pre-tax base snapshot (199900) — never re-derived later
      currency: PRO_CURRENCY,
      interval: PRO_INTERVAL,
      status: "created",
      created_by: input.createdBy,
    })
    .select("id")
    .single();
  if (insErr || !subRow) {
    throw new Error(`Could not start checkout: ${insErr?.message ?? "insert failed"}`);
  }
  const subscriptionId = subRow.id as string;

  // 2) Create the Razorpay order. `notes` echo back on the webhook payload;
  //    the authoritative join key is razorpay_order_id (stored below).
  let order;
  try {
    order = await createOrder({
      amount: PRO_PRICE_CHARGED_PAISE, // charge the all-in Rs 2,359 (base + GST)
      currency: PRO_CURRENCY,
      receipt: `sub_${subscriptionId}`.slice(0, 40),
      notes: { company_id: input.companyId, subscription_id: subscriptionId },
    });
  } catch (err) {
    // Roll back the orphaned pending row so retries stay clean.
    await admin.from("subscriptions").delete().eq("id", subscriptionId);
    throw err;
  }

  // 3) Store the order id (elevated: subscriptions UPDATE is platform-only RLS).
  const { error: updErr } = await admin
    .from("subscriptions")
    .update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);
  if (updErr) {
    await admin.from("subscriptions").delete().eq("id", subscriptionId);
    throw new Error(`Could not persist order: ${updErr.message}`);
  }

  return {
    subscriptionId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId, // PUBLIC key only — the key SECRET never leaves the server.
  };
}

export interface ActivationResult {
  activated: boolean;
  alreadyActive: boolean;
  companyId: string | null;
  subscriptionId: string | null;
}

/**
 * Activates a subscription from a VERIFIED, idempotent webhook. Resolves the
 * subscription by its stored `razorpay_order_id` (the authoritative link set at
 * checkout), flips it to `active` with a 1-year period, and transitions the
 * company `free -> pro` (`plan_status = active`). Runs on the elevated admin
 * client (no user session).
 *
 * This is the ONLY path that grants Pro. Idempotent: if the subscription is
 * already active it is a no-op (no duplicate activation, no second period), and
 * the caller's event-id guard already blocks re-processing at the door.
 */
export async function activateSubscriptionFromWebhook(
  admin: SupabaseClient,
  input: {
    razorpayOrderId: string;
    razorpayPaymentId?: string | null;
    /**
     * Amount Razorpay ACTUALLY captured, in paise, read from the signature-verified webhook payload
     * (`payload.payment.entity.amount`). Optional: when absent (e.g. an order-only event), we log
     * that fact and invoice the EXPECTED stored amount. When present and it differs from expected,
     * we flag loudly (audit + email) but NEVER block activation, and invoice the CAPTURED amount.
     */
    capturedAmountPaise?: number | null;
  },
): Promise<ActivationResult> {
  if (!input.razorpayOrderId) {
    return { activated: false, alreadyActive: false, companyId: null, subscriptionId: null };
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, company_id, status, amount, base_amount")
    .eq("razorpay_order_id", input.razorpayOrderId)
    .maybeSingle();

  // Not one of our orders (e.g. a payment-link event) — nothing to activate here.
  if (!sub) {
    return { activated: false, alreadyActive: false, companyId: null, subscriptionId: null };
  }

  const subscriptionId = sub.id as string;
  const companyId = sub.company_id as string;

  // Idempotent no-op: this period row is already active (re-delivered event / order.paid +
  // payment.captured double-fire).
  if (sub.status === "active") {
    return { activated: false, alreadyActive: true, companyId, subscriptionId };
  }

  const now = new Date();

  // RENEWAL-aware period. If the company has an existing ACTIVE row with a future period end
  // (early renewal while still active), extend from that end; otherwise (initial, or renewal
  // at/after expiry where the prior row is past_due/cancelled) start now.
  const { data: priorActive } = await admin
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("company_id", companyId)
    .eq("status", "active")
    .neq("id", subscriptionId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  let base = now;
  if (priorActive?.current_period_end) {
    const priorEnd = new Date(priorActive.current_period_end as string);
    if (priorEnd.getTime() > now.getTime()) base = priorEnd; // early renew: extend, don't truncate
  }
  const periodEnd = new Date(base);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  // Demote a prior ACTIVE row so the partial-unique (one active per company) is satisfied.
  // Supersede — NOT lapse: lapsed_at stays null (deprecate-don't-destroy; identity preserved).
  if (priorActive?.id) {
    await admin
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: now.toISOString() })
      .eq("id", priorActive.id as string)
      .eq("status", "active");
  }

  // Set activation-local metadata on THIS period row, guarded so a concurrent activation
  // (different event id, same order) can't double-run: only the first (status != active) wins.
  const { data: claimed, error: subErr } = await admin
    .from("subscriptions")
    .update({
      razorpay_payment_id: input.razorpayPaymentId ?? null,
      current_period_start: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionId)
    .neq("status", "active")
    .select("id")
    .maybeSingle();
  if (subErr) {
    throw new Error(`Subscription activation failed: ${subErr.message}`);
  }
  if (!claimed) {
    // Lost the race — another delivery already activated this period. Idempotent no-op.
    return { activated: false, alreadyActive: true, companyId, subscriptionId };
  }

  // Atomic lifecycle transition (both planes): plan_status=active, sub.status=active,
  // current_period_end set, plan forced to 'pro'. The SOLE plan-grant path (never a client claim).
  await transitionPlanStatus(admin, {
    companyId,
    toStatus: "active",
    subscriptionId,
    periodEnd: periodEnd.toISOString(),
    lapsedAt: null,
    activatePro: true,
  });

  // Generate the GST subscription invoice + PDF (Prompt 8b) — BEST-EFFORT.
  // The customer has PAID and Pro is already granted; a failure here must NOT un-grant Pro
  // (the invoice is idempotent + regenerable). Never throws out of activation.
  try {
    // AMOUNT VERIFICATION (Phase 6 Task 4). Compare the amount Razorpay actually captured (from the
    // signature-verified payload) against what we expected to charge. A mismatch NEVER blocks
    // activation (the customer paid — denying them is worse than the mismatch); it is flagged loudly
    // (audit_log + alert email) and the invoice reflects the amount ACTUALLY CAPTURED.
    const expectedPaise = Number(sub.amount ?? 0);
    const capturedPaise = input.capturedAmountPaise ?? null;
    if (capturedPaise == null) {
      // No captured amount on the payload (e.g. order-only event) — log and invoice the expected amount.
      console.warn(
        "[subscription] webhook carried no captured amount; invoicing expected amount",
        { subscriptionId, expectedPaise },
      );
    } else if (capturedPaise !== expectedPaise) {
      // Flag (non-blocking, never throws) — Pro stays granted; invoice will use the captured amount.
      await flagSubscriptionAmountMismatch(admin, {
        companyId,
        subscriptionId,
        expectedPaise,
        capturedPaise,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId ?? null,
      });
    }
    // Invoice the CAPTURED amount when known, else the expected amount.
    const invoicePaise = capturedPaise ?? expectedPaise;
    const amountRupees = invoicePaise / 100;
    // Pre-tax base snapshot (paise -> rupees); null for legacy rows -> billing falls back to inclusive.
    const baseAmountRupees = sub.base_amount != null ? Number(sub.base_amount) / 100 : null;
    const invoice = await createSubscriptionInvoice(admin, {
      subscriptionId,
      companyId,
      amountRupees,
      baseAmountRupees,
      razorpayPaymentId: input.razorpayPaymentId ?? null,
      razorpayOrderId: input.razorpayOrderId,
      periodStart: now.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
    if (invoice) {
      try {
        await saveInvoicePDF(invoice.id);
      } catch (pdfErr) {
        console.error("[subscription] invoice PDF generation failed (Pro still granted)", pdfErr);
      }
    }
  } catch (invErr) {
    console.error("[subscription] invoice generation failed (Pro still granted)", invErr);
  }

  // Payment-received notification (§7) — best-effort; never affects the grant.
  try {
    await notifyPaymentReceived(admin, { companyId, subscriptionId });
  } catch (notifyErr) {
    console.error("[subscription] payment_received notify failed (Pro still granted)", notifyErr);
  }

  return { activated: true, alreadyActive: false, companyId, subscriptionId };
}

/**
 * Flag a subscription payment whose CAPTURED amount differs from the EXPECTED amount (Phase 6
 * Task 4). Writes a service-role audit_log row AND sends an internal alert email. Every step is
 * wrapped so NO throw can escape into the webhook/activation path — the customer has already paid
 * and Pro is already granted; flagging must never undo that. The invoice separately reflects the
 * amount actually captured, so the legal record matches the real transaction.
 */
async function flagSubscriptionAmountMismatch(
  admin: SupabaseClient,
  params: {
    companyId: string;
    subscriptionId: string;
    expectedPaise: number;
    capturedPaise: number;
    razorpayOrderId: string;
    razorpayPaymentId: string | null;
  },
): Promise<void> {
  const expectedRs = (params.expectedPaise / 100).toFixed(2);
  const capturedRs = (params.capturedPaise / 100).toFixed(2);
  try {
    // (a) audit_log — service-role insert (bypasses RLS; migration 018 permits actor_type 'system').
    try {
      await admin.from("audit_log").insert({
        actor_user_id: null,
        actor_type: "system",
        company_id: params.companyId,
        action: "subscription.amount_mismatch",
        entity: "subscription",
        entity_id: params.subscriptionId,
        after: {
          expected_paise: params.expectedPaise,
          captured_paise: params.capturedPaise,
          razorpay_order_id: params.razorpayOrderId,
          razorpay_payment_id: params.razorpayPaymentId,
        },
      });
    } catch (auditErr) {
      console.error("[subscription] amount_mismatch audit insert failed (activation unaffected)", auditErr);
    }
    // (b) internal alert email.
    try {
      await sendNotificationEmail({
        to: "contact@neonvisuals.in",
        subject: `Subscription payment amount mismatch: ${params.subscriptionId}`,
        html:
          `<p>A Pro subscription payment was captured for an amount that does <strong>not match</strong> ` +
          `the expected charge. Pro was still activated (the customer paid); the invoice reflects the ` +
          `amount actually captured. Please reconcile.</p>` +
          `<ul>` +
          `<li>Subscription: ${params.subscriptionId}</li>` +
          `<li>Expected: Rs ${expectedRs}</li>` +
          `<li>Captured: Rs ${capturedRs}</li>` +
          `<li>Razorpay order: ${params.razorpayOrderId}</li>` +
          `<li>Razorpay payment: ${params.razorpayPaymentId ?? "(none)"}</li>` +
          `</ul>`,
        template: "subscription_amount_mismatch",
      });
    } catch (emailErr) {
      console.error("[subscription] amount_mismatch alert email failed (activation unaffected)", emailErr);
    }
  } catch (err) {
    // belt-and-braces: nothing from this flag may escape into the activation path.
    console.error("[subscription] amount_mismatch flag failed (activation unaffected)", err);
  }
}
