import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrder } from "@/lib/services/razorpay";

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

/** Pro plan price. GST in/exclusive treatment is deferred to 8b (invoices). */
export const PRO_PRICE_RUPEES = 1999;
export const PRO_PRICE_PAISE = PRO_PRICE_RUPEES * 100; // 199900 paise
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
      amount: PRO_PRICE_PAISE,
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
      amount: PRO_PRICE_PAISE,
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
  input: { razorpayOrderId: string; razorpayPaymentId?: string | null },
): Promise<ActivationResult> {
  if (!input.razorpayOrderId) {
    return { activated: false, alreadyActive: false, companyId: null, subscriptionId: null };
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, company_id, status")
    .eq("razorpay_order_id", input.razorpayOrderId)
    .maybeSingle();

  // Not one of our orders (e.g. a payment-link event) — nothing to activate here.
  if (!sub) {
    return { activated: false, alreadyActive: false, companyId: null, subscriptionId: null };
  }

  const subscriptionId = sub.id as string;
  const companyId = sub.company_id as string;

  // Idempotent no-op: already active (re-delivered event).
  if (sub.status === "active") {
    return { activated: false, alreadyActive: true, companyId, subscriptionId };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({
      status: "active",
      razorpay_payment_id: input.razorpayPaymentId ?? null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionId)
    .neq("status", "active"); // guard against a concurrent activation
  if (subErr) {
    throw new Error(`Subscription activation failed: ${subErr.message}`);
  }

  // Grant Pro. This is the sole plan-write path (never a client claim).
  const { error: companyErr } = await admin
    .from("companies")
    .update({ plan: "pro", plan_status: "active" })
    .eq("id", companyId);
  if (companyErr) {
    throw new Error(`Plan activation failed: ${companyErr.message}`);
  }

  return { activated: true, alreadyActive: false, companyId, subscriptionId };
}
