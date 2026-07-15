/**
 * ============================================================================
 * RLS & Service-Role Policy (rewritten for migration 018 — tenancy foundation)
 * ============================================================================
 * Multi-tenancy is enforced at the DATABASE level via RLS built around
 * MEMBERSHIP, not profiles.role (which is DEPRECATED and removed in Prompt 2).
 * RLS helper functions (SECURITY DEFINER, empty search_path):
 *   is_platform_staff()                      -> caller is Neon Visuals staff
 *   platform_role_of()                       -> owner|admin|ops|finance|support
 *   user_company_ids()                       -> SETOF company_id (active memberships)
 *   has_company_role(company, role[])        -> membership role check
 *   user_department_id(company)              -> caller's department in that company
 *
 * Base tenant rule on every company-owned table:
 *     company_id IN (SELECT user_company_ids())   [+ is_platform_staff() for reads]
 *
 * employees — PRIVACY SPLIT (real, DB-enforced):
 *   Base table SELECT (incl. phone/dob_day/dob_month/delivery_address) is
 *   granted ONLY to org_owner/org_admin/hr (all rows) and manager (own dept).
 *   finance/viewer are DENIED base rows. They read `employees_safe`, a
 *   SECURITY DEFINER view that omits those four PII columns. Writes: owner/admin/hr.
 *
 * audit_log — APPEND-ONLY. Read by own company + platform staff. There is NO
 *   UPDATE/DELETE policy for anyone, and a trigger (audit_log_is_append_only)
 *   blocks UPDATE/DELETE even for the table owner / service role.
 *
 * Internal CRM (leads/lead_activities/lead_status_history), platform_staff,
 *   impersonation_sessions: platform staff only. Public lead capture inserts
 *   via the service role.
 *
 * ---------------------------------------------------------------------------
 * SERVICE-ROLE CLIENT RULE (createAdminClient) — READ THIS BEFORE USING IT
 * ---------------------------------------------------------------------------
 * The service-role client BYPASSES RLS entirely. It is permitted ONLY in:
 *   (a) webhooks (e.g. /api/webhooks/razorpay),
 *   (b) cron jobs (e.g. /api/reminders/cron),
 *   (c) explicitly cross-tenant PLATFORM-plane operations (e.g. /api/admin/*).
 * Every TENANT-plane read/write MUST use the request-scoped cookie client so
 * RLS applies, AND MUST additionally perform an API-layer company_id check.
 * Belt AND braces.
 *
 * MIGRATED IN PROMPT 2 (item 6): billing.ts, order.ts, quote.ts, and lead.ts
 * now use this request-scoped RLS client for tenant-plane work; role gating is
 * done by authorize() (src/lib/authz/matrix.ts) and RLS is the backstop.
 * memory.ts ALWAYS used the RLS client — it was never a violation; the earlier
 * note was incorrect and has been removed.
 * STILL ELEVATED (justified system callers, service-role by design):
 *   - Razorpay webhook (billing.handleRazorpayWebhook + threaded helpers),
 *   - reminder cron (/api/reminders/cron), /api/admin/team,
 *   - public lead capture (lead.captureLead), lead→client company insert
 *     (lead.convertLeadToClient), onboarding company insert, PDF storage upload.
 * ============================================================================
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Next.js 16: `cookies()` is async and must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if there is proxy middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
