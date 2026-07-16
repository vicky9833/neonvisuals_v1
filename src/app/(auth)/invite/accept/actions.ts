"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMemberJoinedEmail } from "@/lib/services/email";

export interface AcceptInviteResult {
  ok: boolean;
  error?: string;
  companyId?: string;
}

/**
 * Accept an invite. The membership INSERT is performed ENTIRELY by the
 * `accept_invite` SECURITY DEFINER RPC, invoked under the INVITEE'S OWN session
 * (request-scoped client) — never the service-role client. Identity + all
 * membership values are derived in-DB from the matched invite + session.
 *
 * The join-notification email (owner/admin) is a separate system concern and
 * looks up recipients via the admin client; it can never affect the accept.
 */
export async function acceptInvite(rawToken: string): Promise<AcceptInviteResult> {
  const token = (rawToken ?? "").trim();
  if (!token) return { ok: false, error: "Missing invite token." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in with your invited email to accept." };
  }

  // RLS-authenticated RPC call under the invitee's JWT.
  const { data, error } = await supabase.rpc("accept_invite", { raw_token: token });
  if (error) {
    // Do not leak internals; the RPC raises a single user-safe message.
    return {
      ok: false,
      error:
        "This invite is invalid, expired, already used, or not addressed to your account.",
    };
  }
  const companyId = typeof data === "string" ? data : null;

  // Fire-and-forget join notification to owner/admins (system path).
  if (companyId) {
    try {
      await notifyOwners(companyId, user.email ?? "A new member");
    } catch (err) {
      console.error("[invite/accept] join notification failed:", err);
    }
  }

  return { ok: true, companyId: companyId ?? undefined };
}

async function notifyOwners(companyId: string, memberEmail: string): Promise<void> {
  const admin = createAdminClient();
  const [{ data: company }, { data: owners }] = await Promise.all([
    admin.from("companies").select("name").eq("id", companyId).maybeSingle(),
    admin
      .from("company_members")
      .select("user_id, role")
      .eq("company_id", companyId)
      .eq("status", "active")
      .in("role", ["org_owner", "org_admin"]),
  ]);
  const ownerIds = (owners ?? []).map((o) => o.user_id as string);
  if (ownerIds.length === 0) return;
  const { data: profiles } = await admin
    .from("profiles")
    .select("email")
    .in("id", ownerIds);
  const recipients = (profiles ?? [])
    .map((p) => p.email as string | null)
    .filter((e): e is string => Boolean(e) && e !== memberEmail);
  if (recipients.length === 0) return;

  await sendMemberJoinedEmail({
    to: recipients,
    companyName: (company?.name as string) ?? "your organisation",
    memberEmail,
  });
}
