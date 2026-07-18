import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionPlanStatus } from "@/lib/engines/subscription";
import { notifyPlanExpiring } from "@/lib/engines/notifications";

export const runtime = "nodejs";

/**
 * Billing lifecycle cron (§8c-i) — SEPARATE from /api/reminders/cron. Daily.
 * CRON_SECRET Bearer-protected (Vercel Cron sends it; 401 otherwise).
 *
 * The annual one-time model: the cron owns expiry. For each subscription in {active, past_due}:
 *   (a) active & now >= period_end − 7d  → plan_expiring notification (dedup once per period)
 *   (b) active & now >= period_end       → active → past_due (grace begins; Pro STAYS ON)
 *   (c) past_due & now >= period_end + 7d → past_due → lapsed (Pro cut; plan stays 'pro', never deleted)
 *
 * Idempotent by current-status guard: after (b) the row is past_due (skips (b)); after (c) it is
 * cancelled and out of scope. Re-running the same day is a no-op. companies.plan is NEVER flipped
 * and NO data is ever deleted. MUST NOT generate occasions, email real tenants, or call the
 * reminders cron — it only touches subscriptions/plan_status + billing notifications.
 */
const GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const stats = { scanned: 0, expiringNotified: 0, toPastDue: 0, toLapsed: 0 };

  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("id, company_id, status, current_period_end")
    .in("status", ["active", "past_due"]);
  if (error) {
    console.error("[billing/cron] scan failed:", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  for (const s of subs ?? []) {
    stats.scanned += 1;
    const endStr = s.current_period_end as string | null;
    if (!endStr) continue; // no period window yet (e.g. a stray 'created'->active edge); skip
    const end = new Date(endStr).getTime();
    const companyId = s.company_id as string;
    const subId = s.id as string;

    try {
      if (s.status === "active") {
        if (now >= end) {
          // (b) grace begins — Pro stays on.
          await transitionPlanStatus(admin, { companyId, toStatus: "past_due", subscriptionId: subId, periodEnd: endStr });
          stats.toPastDue += 1;
        } else if (now >= end - GRACE_DAYS * DAY_MS) {
          // (a) T-7 renewal reminder (dedup once per subscription+period).
          await notifyPlanExpiring(admin, { companyId, subscriptionId: subId, periodEnd: endStr });
          stats.expiringNotified += 1;
        }
      } else if (s.status === "past_due") {
        if (now >= end + GRACE_DAYS * DAY_MS) {
          // (c) lapse — cut Pro; plan_status='lapsed', sub 'cancelled', lapsed_at=now. Never deletes.
          await transitionPlanStatus(admin, { companyId, toStatus: "lapsed", subscriptionId: subId, lapsedAt: new Date().toISOString() });
          stats.toLapsed += 1;
        }
      }
    } catch (err) {
      console.error(`[billing/cron] transition failed for sub ${subId}:`, err);
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}
