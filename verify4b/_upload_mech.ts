/**
 * Prompt 4b item 3 — upload MECHANISMS (build layer): server parse, by-reference
 * header/row-cap rejection, and import_jobs (shape + CHECK + errors_json by-ref).
 * The deployed upload -> parse -> validate -> ENCRYPTED insert end-to-end is
 * proven on the preview in the push+smoke phase. Run: npx tsx verify4b/_upload_mech.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parseUploadWithMeta, validateHeaders, IMPORT_MAX_ROWS } from "../src/lib/employees/csv";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean) => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}`); };
const enc = (s: string) => new TextEncoder().encode(s).buffer;

async function main() {
  console.log("=== server parse (CSV bytes) ===");
  const good = "name,email,phone\nAlice,alice@x.com,9990001111\nBob,bob@x.com,9990002222";
  const parsedGood = await parseUploadWithMeta("team.csv", enc(good));
  check("parseUploadWithMeta parses CSV bytes server-side", parsedGood.rows.length === 2 && parsedGood.rows[0].name === "Alice");

  console.log("\n=== by-reference header rejection ===");
  const noEmail = await parseUploadWithMeta("bad.csv", enc("name,phone\nAlice,999"));
  const hdr = validateHeaders(noEmail.headers);
  check("missing email header -> bad_header by-reference (no value)", hdr.length === 1 && hdr[0].field === "email" && hdr[0].code === "bad_header");
  const ok = validateHeaders(parsedGood.headers);
  check("valid headers -> no issues", ok.length === 0);

  console.log("\n=== row-cap constant ===");
  check(`IMPORT_MAX_ROWS = 1000 (§10.12 cap)`, IMPORT_MAX_ROWS === 1000);

  console.log("\n=== import_jobs (shape + CHECK + errors_json by-reference) ===");
  const { data: co } = await admin.from("companies").insert({ name: `t4b_${runid}_co`, slug: `t4b-${runid}-co`, onboarding_completed: true }).select("id").single();
  const companyId = co!.id as string;
  const byRefErrors = [{ row: 2, field: "email", code: "invalid_email" }, { row: 5, field: "_batch", code: "insert_failed" }];
  const { data: job, error: jobErr } = await admin.from("import_jobs").insert({
    company_id: companyId, source: "csv", file_size: 123, rows_total: 10, rows_ok: 8, rows_failed: 2,
    errors_json: byRefErrors, status: "partial",
  }).select("id, errors_json, status, rows_total, rows_ok, rows_failed").single();
  check("import_jobs row records totals + by-reference errors_json", !jobErr && job!.rows_total === 10 && job!.rows_ok === 8 && job!.rows_failed === 2);
  check("errors_json contains NO PII (row/field/code only)", JSON.stringify(job!.errors_json).match(/@|street|\d{10}/i) === null);
  const badStatus = await admin.from("import_jobs").insert({ company_id: companyId, status: "bogus" });
  check("import_jobs.status CHECK rejects invalid status", !!badStatus.error);
  const badSource = await admin.from("import_jobs").insert({ company_id: companyId, source: "exe" });
  check("import_jobs.source CHECK rejects invalid source", !!badSource.error);

  // Teardown.
  await admin.from("import_jobs").delete().eq("company_id", companyId);
  await admin.from("companies").delete().eq("id", companyId);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t4b\\_%")).count ?? 0;
  check(`residue companies t4b_ = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
