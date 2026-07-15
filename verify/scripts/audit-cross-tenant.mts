/**
 * Item 3/8 verification: produce a REAL cross-tenant audit_log row through the
 * ACTUAL RLS path (audit_log_insert_self, actor_user_id = auth.uid()) — i.e. as
 * the authenticated platform owner, NOT the service-role client — and prove the
 * append-only trigger still blocks UPDATE.
 *
 * Reads creds from .env.local. Never prints secrets. Output → verify/3_audit_run.txt
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

function loadEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = "contact.neonvisuals@gmail.com";

const log: string[] = [];
const out = (s: string) => {
  log.push(s);
  console.log(s);
};

async function main() {
  const admin = createClient(url, service, { auth: { persistSession: false } });

  // 1. Mint a genuine session for the platform owner (no email is sent by
  //    generateLink; it only returns the verifiable token).
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: OWNER_EMAIL,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkErr?.message ?? "no token"}`);
  }
  const ownerId = linkData.user?.id;
  out(`platform owner resolved: ${OWNER_EMAIL} (id ${ownerId ? ownerId.slice(0, 8) + "…" : "?"})`);

  // 2. Exchange the token for an authenticated session on a user-scoped client.
  const userClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: verifyData, error: verifyErr } = await userClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyErr || !verifyData?.user) {
    throw new Error(`verifyOtp failed: ${verifyErr?.message ?? "no session"}`);
  }
  out(`authenticated as platform owner via user-scoped client (auth.uid populated)`);

  // 3. Insert a REAL cross-tenant audit row through RLS (audit_log_insert_self).
  //    This mirrors exactly what auditCrossTenantAccess()/writeAudit() emit when
  //    a platform user hits GET /api/orders (item 3).
  const insertRow = {
    actor_user_id: verifyData.user.id,
    actor_type: "platform" as const,
    company_id: null as string | null,
    action: "order.list",
    entity: "order",
    entity_id: null as string | null,
  };
  const { data: inserted, error: insErr } = await userClient
    .from("audit_log")
    .insert(insertRow)
    .select("id, actor_type, action, entity, company_id, created_at")
    .single();
  if (insErr) throw new Error(`audit insert failed (RLS): ${insErr.message}`);
  out("AUDIT ROW WRITTEN (via audit_log_insert_self RLS, not service role):");
  out(JSON.stringify(inserted, null, 2));

  // 4. Prove append-only: UPDATE must be rejected by the trigger.
  const { error: updErr } = await userClient
    .from("audit_log")
    .update({ action: "tampered" })
    .eq("id", inserted!.id);
  out(
    updErr
      ? `APPEND-ONLY OK — UPDATE rejected: ${updErr.message}`
      : "APPEND-ONLY FAILED — UPDATE unexpectedly succeeded!",
  );

  await userClient.auth.signOut();
  writeFileSync("verify/3_audit_run.txt", log.join("\n") + "\n", "utf8");
}

main().catch((e) => {
  out(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
  writeFileSync("verify/3_audit_run.txt", log.join("\n") + "\n", "utf8");
  process.exit(1);
});
