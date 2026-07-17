import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { sendMemberRoleChangedEmail } from "@/lib/services/email";
import { notify, NOTIFICATION_TYPES } from "@/lib/engines/notifications";

export const runtime = "nodejs";

/**
 * Tenant team member mutations (Prompt 3b item 5). RLS `company_members_manage`
 * (owner/admin, own company) + the matrix gate authorization; the DB last-owner
 * trigger (migration 029) is the invariant. org_owner is NOT a settable target
 * — ownership moves only via /api/team/transfer.
 */
const ROLE_TARGETS = ["org_admin", "hr", "finance", "manager", "viewer"] as const;

/**
 * PATCH body (Prompt 7b item 1): change role and/or set approval_limit.
 *   approvalLimit: non-negative integer rupees, or explicit null (= no approval authority; the
 *   matrix NULL-denies, so an hr/manager with a null limit cannot approve any spend). This is the
 *   value the quote.approve ≤limit conditional reads — without it the whole feature is DOA.
 * At least one field must be present.
 */
const APPROVAL_LIMIT_MAX = 999_999_999;
const patchSchema = z
  .object({
    role: z.enum(ROLE_TARGETS).optional(),
    approvalLimit: z
      .number()
      .int()
      .min(0)
      .max(APPROVAL_LIMIT_MAX)
      .nullable()
      .optional(),
  })
  .refine((v) => v.role !== undefined || v.approvalLimit !== undefined, {
    message: "Provide a role and/or an approvalLimit.",
  });

function mapGuard(msg: string | undefined): NextResponse | null {
  if (msg && msg.includes("LAST_OWNER")) {
    return NextResponse.json(
      { error: "last_owner", message: "Cannot remove the last owner — transfer ownership first." },
      { status: 409 },
    );
  }
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const principal = await requireTenant("members.change_role", null);
    const companyId = principal.company_id;
    if (!companyId) return NextResponse.json({ error: "no_company", message: "No company membership." }, { status: 400 });
    const { userId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid role." }, { status: 400 });
    }

    // Old role (scoped lookup) for the security-notice email.
    const admin = createAdminClient();
    const { data: existing } = await admin.from("company_members").select("role").eq("company_id", companyId).eq("user_id", userId).maybeSingle();

    // Build the mutation from only the provided fields. approval_limit is the value the
    // quote.approve ≤limit conditional reads (item 1 — DOA fix); explicit null clears authority.
    const patch: { role?: string; approval_limit?: number | null } = {};
    if (parsed.data.role !== undefined) patch.role = parsed.data.role;
    if (parsed.data.approvalLimit !== undefined) patch.approval_limit = parsed.data.approvalLimit;

    // RLS-scoped mutation; the last-owner trigger is the backstop.
    const supabase = await createClient();
    const { data: updated, error } = await supabase
      .from("company_members")
      .update(patch)
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .select("user_id, role, approval_limit")
      .maybeSingle();
    if (error) {
      const guard = mapGuard(error.message);
      if (guard) return guard;
      return NextResponse.json({ error: "update_failed", message: error.message }, { status: 400 });
    }
    if (!updated) {
      return NextResponse.json({ error: "not_found", message: "Member not found in your company." }, { status: 404 });
    }

    // §7 role-changed security notice (affected user + org_owner) — only when the role changed.
    if (parsed.data.role !== undefined && parsed.data.role !== (existing?.role as string)) {
      try {
        await notifyRoleChange(admin, companyId, userId, (existing?.role as string) ?? "?", parsed.data.role, principal.email);
      } catch (e) { console.error("[team/members] role-change email failed:", e); }
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[team/members PATCH]", err);
    return NextResponse.json({ error: "server_error", message: "Could not change role." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const principal = await requireTenant("members.invite", null); // invite/remove capability
    const companyId = principal.company_id;
    if (!companyId) return NextResponse.json({ error: "no_company", message: "No company membership." }, { status: 400 });
    const { userId } = await params;

    const supabase = await createClient();
    const { data: removed, error } = await supabase
      .from("company_members")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();
    if (error) {
      const guard = mapGuard(error.message);
      if (guard) return guard;
      return NextResponse.json({ error: "remove_failed", message: error.message }, { status: 400 });
    }
    if (!removed) {
      return NextResponse.json({ error: "not_found", message: "Member not found in your company." }, { status: 404 });
    }

    // In-app (6a): notify org_owner + the removed user. No pre-existing email to preserve.
    try {
      await notify(createAdminClient(), {
        type: NOTIFICATION_TYPES.MEMBER_REMOVED,
        audience: [{ plane: "tenant", role: "org_owner" }],
        recipients: [userId],
        companyId,
        title: "Team membership updated",
        body: "A member was removed from the team.",
        link: "/dashboard/team",
      });
    } catch (e) { console.error("[team/members] remove in-app notify failed:", e); }

    return NextResponse.json({ data: { removed: userId } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[team/members DELETE]", err);
    return NextResponse.json({ error: "server_error", message: "Could not remove member." }, { status: 500 });
  }
}

async function notifyRoleChange(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  affectedUserId: string,
  oldRole: string,
  newRole: string,
  changedByEmail: string,
) {
  const [{ data: company }, { data: affected }, { data: ownerRow }] = await Promise.all([
    admin.from("companies").select("name").eq("id", companyId).maybeSingle(),
    admin.from("profiles").select("email").eq("id", affectedUserId).maybeSingle(),
    admin.from("company_members").select("user_id").eq("company_id", companyId).eq("role", "org_owner").eq("status", "active").maybeSingle(),
  ]);
  let ownerEmail: string | null = null;
  if (ownerRow?.user_id) {
    const { data: op } = await admin.from("profiles").select("email").eq("id", ownerRow.user_id).maybeSingle();
    ownerEmail = (op?.email as string) ?? null;
  }
  const recipients = Array.from(new Set([affected?.email as string | undefined, ownerEmail].filter((e): e is string => Boolean(e))));
  if (recipients.length > 0) {
    await sendMemberRoleChangedEmail({
      to: recipients,
      companyName: (company?.name as string) ?? "your organisation",
      memberEmail: (affected?.email as string) ?? affectedUserId,
      oldRole, newRole, changedBy: changedByEmail,
    });
  }
  // In-app (6a): affected user + org_owner. Reference-style title (no PII).
  await notify(admin, {
    type: NOTIFICATION_TYPES.MEMBER_ROLE_CHANGED,
    audience: [{ plane: "tenant", role: "org_owner" }],
    recipients: [affectedUserId],
    companyId,
    title: "Team role updated",
    body: `A team member's role was changed to ${newRole}.`,
    link: "/dashboard/team",
  });
}
