import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiryISO,
  inviteAcceptUrl,
} from "@/lib/invites";
import { sendMemberInviteEmail } from "@/lib/services/email";

export const runtime = "nodejs";

/**
 * Create-invite flow (Prompt 3a item 2). Owner/admin invites a member.
 *
 * The insert runs on the REQUEST-SCOPED (user) client so the existing
 * `invites_manage` RLS policy (own company + org_owner/org_admin) is the gate —
 * NOT the service-role client. `members.invite` (matrix) is the role check.
 *
 * Token: high-entropy raw token → link/email only; ONLY its SHA-256 hash is
 * stored (token_hash). expires_at = +7d, status = 'pending'.
 */

// org_owner is intentionally NOT invitable (that seat is set at creation;
// ownership transfer is Prompt 3b).
const INVITABLE_ROLES = ["org_admin", "hr", "finance", "manager", "viewer"] as const;

const schema = z.object({
  email: z.string().email(),
  role: z.enum(INVITABLE_ROLES),
  departmentId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    // Role gate (owner/admin) in the caller's active company.
    const principal = await requireTenant("members.invite", null);
    const companyId = principal.company_id;
    if (!companyId) {
      return NextResponse.json(
        { error: "no_company", message: "No company membership." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const { email, role, departmentId } = parsed.data;

    const rawToken = generateInviteToken();
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = inviteExpiryISO();

    // RLS-scoped insert (invites_manage): owner/admin, own company only.
    const supabase = await createClient();
    const { data: invite, error } = await supabase
      .from("invites")
      .insert({
        company_id: companyId,
        email: email.toLowerCase(),
        role,
        department_id: departmentId ?? null,
        token_hash: tokenHash,
        expires_at: expiresAt,
        status: "pending",
        invited_by: principal.id,
      })
      .select("id, email, role, company_id, status, expires_at")
      .single();

    if (error || !invite) {
      // RLS denial (non-owner/admin) surfaces here as a 403-ish failure.
      return NextResponse.json(
        { error: "invite_failed", message: error?.message ?? "Could not create invite." },
        { status: 403 },
      );
    }

    const acceptUrl = inviteAcceptUrl(rawToken);

    // Email the invite link (Resend; logged via email_log). Never blocks/leaks.
    try {
      const inviterName = principal.email?.split("@")[0] ?? "A colleague";
      await sendMemberInviteEmail({
        to: email,
        inviterName,
        role,
        acceptUrl,
      });
    } catch (err) {
      console.error("[team/invites] invite email failed:", err);
    }

    // The raw token/link is returned to the inviter (who initiated it); the DB
    // stored only the hash.
    return NextResponse.json({ data: { id: invite.id, acceptUrl } }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[team/invites]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not create invite." },
      { status: 500 },
    );
  }
}
