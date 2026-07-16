// Prompt 3a item 4 — invite + joined emails via Resend, logged to email_log.
// Uses the REAL template functions (pure) and mirrors sendEmail()'s Resend
// call + email_log write exactly (email.ts is server-only + uses `@/` aliases,
// so it can't be imported under tsx; the senders are thin wrappers over these).
// Sends to Resend's test sink so no real inbox is touched. Cleans up log rows.
import { readFileSync } from "node:fs";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { memberInviteTemplate, memberJoinedTemplate } from "../src/lib/services/email-templates";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const resend = new Resend(env.RESEND_API_KEY);
const FROM = "Neon Visuals <hello@neonvisuals.in>";
const TO = "delivered@resend.dev"; // Resend test sink — real id, no real inbox
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

async function sendAndLog(template: string, subject: string, html: string) {
  const r = await resend.emails.send({ from: FROM, to: TO, subject, html });
  const id = r.data?.id ?? null;
  const status = r.error ? "failed" : id ? "sent" : "failed";
  const err = r.error ? JSON.stringify(r.error) : id ? null : "no id";
  await admin.from("email_log").insert({
    to_email: TO, subject, template, resend_id: id, status, error: err,
    metadata: { t3a: runid },
  });
  console.log(`${template}: resend_id=${id ?? "(none)"} status=${status}${err ? " error=" + err : ""}`);
  return id;
}

async function main() {
  console.log("=== ITEM 4: member_invite + member_joined via Resend ===");
  await sendAndLog(
    "member_invite",
    "You're invited to join a team on Neon Visuals",
    memberInviteTemplate({ inviterName: "t3a Owner", role: "viewer", acceptUrl: `${env.NEXT_PUBLIC_APP_URL ?? "https://neonvisuals.in"}/invite/accept?token=T3A_TEST_TOKEN` }),
  );
  await sendAndLog(
    "member_joined",
    "t3a member joined t3a Co",
    memberJoinedTemplate({ companyName: "t3a Co", memberEmail: "t3a_member@example.com" }),
  );

  const { data: rows } = await admin
    .from("email_log")
    .select("template, resend_id, status, to_email")
    .eq("metadata->>t3a", runid);
  console.log("email_log rows written:", JSON.stringify(rows));

  // cleanup
  await admin.from("email_log").delete().eq("metadata->>t3a", runid);
  const { count } = await admin.from("email_log").select("id", { count: "exact", head: true }).eq("metadata->>t3a", runid);
  console.log("RESIDUE email_log(t3a)=", count);
}

main().catch(async (e) => {
  console.error("FATAL", e);
  try { await admin.from("email_log").delete().eq("metadata->>t3a", runid); } catch {}
  process.exit(1);
});
