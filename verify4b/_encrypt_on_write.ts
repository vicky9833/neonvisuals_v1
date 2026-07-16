/**
 * Prompt 4b item 1 — encryption-on-write at bulk (1000 rows).
 * Exercises the SAME core the import path uses (encryptPII -> encryptWithKey):
 * encrypts 1000 synthetic phone/address values and lands 1000 employee_pii rows,
 * then proves EVERY phone_enc/delivery_address_enc is a {v,iv,tag,ct} envelope
 * (zero plaintext) and each decrypts to its source. Synthetic PII only.
 * Run: npx tsx verify4b/_encrypt_on_write.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { encryptWithKey, decryptWithKey, parseEnvelope } from "../src/lib/services/pii-crypto-core";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean) => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}`); };

async function main() {
  const { data: keyB64 } = await admin.rpc("get_pii_dek", { p_version: 1 });
  const key = Buffer.from(keyB64 as string, "base64");

  const { data: co } = await admin.from("companies").insert({ name: `t4b_${runid}_co`, slug: `t4b-${runid}-co`, onboarding_completed: true }).select("id").single();
  const companyId = co!.id as string;

  const N = 1000;
  // Insert 1000 identity rows.
  const empRows = Array.from({ length: N }, (_, i) => ({ company_id: companyId, full_name: `t4b_${runid}_emp_${i}`, email: `t4b_${runid}_${i}@example.com` }));
  const ids: string[] = [];
  for (let i = 0; i < N; i += 500) {
    const { data, error } = await admin.from("employees").insert(empRows.slice(i, i + 500)).select("id, email");
    if (error) throw new Error(error.message);
    ids.push(...(data ?? []).map((r) => r.id as string));
  }
  check(`inserted ${N} employees`, ids.length === N);

  // Encrypt phone + address per row (same core as encryptPII) and insert employee_pii.
  const expected = new Map<string, { phone: string; addr: string }>();
  const piiRows = ids.map((id, i) => {
    const phone = `98${String(1000000000 + i).slice(-8)}`;
    const addr = `t4b ${runid} addr ${i}, Bengaluru`;
    expected.set(id, { phone, addr });
    return {
      employee_id: id, company_id: companyId,
      phone_enc: encryptWithKey(key, 1, phone),
      delivery_address_enc: encryptWithKey(key, 1, addr),
      city: "Bengaluru", pincode: "560001", dob_day: (i % 28) + 1, dob_month: (i % 12) + 1,
    };
  });
  for (let i = 0; i < N; i += 500) {
    const { error } = await admin.from("employee_pii").insert(piiRows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }

  // Read all back; verify every enc column is an envelope + decrypts to source.
  const { data: back } = await admin.from("employee_pii").select("employee_id, phone_enc, delivery_address_enc").eq("company_id", companyId);
  const rows = back ?? [];
  check(`read back ${N} employee_pii rows`, rows.length === N);

  let envelopes = 0, plaintextLeaks = 0, decryptOk = 0;
  for (const r of rows) {
    const exp = expected.get(r.employee_id as string)!;
    try {
      const pe = parseEnvelope(r.phone_enc as string);
      const ae = parseEnvelope(r.delivery_address_enc as string);
      if (pe.v && pe.iv && pe.tag && pe.ct && ae.v && ae.iv && ae.tag && ae.ct) envelopes++;
    } catch { /* not an envelope */ }
    if ((r.phone_enc as string) === exp.phone || (r.delivery_address_enc as string) === exp.addr) plaintextLeaks++;
    if (decryptWithKey(() => key, r.phone_enc as string) === exp.phone &&
        decryptWithKey(() => key, r.delivery_address_enc as string) === exp.addr) decryptOk++;
  }
  check(`ALL ${N}/${N} rows have envelope phone_enc + delivery_address_enc`, envelopes === N);
  check(`ZERO plaintext at rest (leaks=${plaintextLeaks})`, plaintextLeaks === 0);
  check(`ALL ${N}/${N} decrypt to source for authorized reader (ok=${decryptOk})`, decryptOk === N);

  // Teardown (no members -> no last-owner guard; cascade deletes pii).
  await admin.from("employee_pii").delete().eq("company_id", companyId);
  await admin.from("employees").delete().eq("company_id", companyId);
  await admin.from("companies").delete().eq("id", companyId);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t4b\\_%")).count ?? 0;
  check(`residue companies t4b_ = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
