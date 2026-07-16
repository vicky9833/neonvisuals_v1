/**
 * Prompt 4b item 2 — PII-NEVER-LOGGED (adversarial, §10.12-13).
 * Feeds malformed rows carrying UNIQUE sentinel PII values through the REAL
 * parse+validate pipeline (parseCsvText -> validateCSVRows) + the error-report
 * generation, capturing all console output, and greps every output surface for
 * the sentinels. ZERO hits required. Run: npx tsx verify4b/_no_pii_logs.ts
 */
import Papa from "papaparse";
import { parseCsvText, validateCSVRows } from "../src/lib/employees/csv";
import type { ImportRowError } from "../src/types/employee";

// Unique sentinels — if ANY appears in any error/log/report, it is a leak.
const S = {
  phone: "SENTINELPHONE0001112223",
  addr: "SENTINELADDR_42_SECRET_STREET",
  name: "SENTINELNAME_ZORP",
  dob: "SENTINELDOB_31131999",
  email: "SENTINELEMAIL_zorp_at_x",
};
const SENTINELS = Object.values(S);

// Capture console output.
const captured: string[] = [];
for (const m of ["log", "error", "warn", "info", "debug"] as const) {
  const orig = console[m].bind(console);
  console[m] = (...args: unknown[]) => {
    captured.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    orig(...args);
  };
}

function main() {
  let pass = true;
  const check = (l: string, c: boolean) => { if (!c) pass = false; process.stdout.write(`  ${c ? "PASS" : "FAIL"}  ${l}\n`); };

  // Adversarial CSV: bad phone, oversized/unicode address, injection-ish, missing required,
  // invalid email, invalid enums/dates — all carrying sentinels.
  const csv = [
    "name,email,phone,delivery_address,date_of_birth,tshirt_size,dietary_preference",
    `${S.name},${S.email},${S.phone},"${S.addr}",${S.dob},HUGE,plutonium`,
    `,${S.email},${S.phone},"${S.addr} ${"x".repeat(5000)}",13/13/2020,XL,veg`,
    `${S.name}2,=cmd|' /C calc'!A1,${S.phone},"=HYPERLINK(${S.addr})",not-a-date,M,veg`,
    `${S.name}3,,,${S.addr},,,`,
  ].join("\n");

  const rows = parseCsvText(csv);
  const validated = validateCSVRows(rows);

  // Build the by-reference error report (row/field/code) — the SAME data downloadErrorReport emits.
  const errors: ImportRowError[] = validated
    .filter((r) => !r.isValid)
    .flatMap((r) => r.errors.map((e) => ({ row: r.row, field: e.field, code: e.code })));
  const reportCsv = Papa.unparse({ fields: ["row", "field", "code"], data: errors.map((e) => [e.row, e.field, e.code]) });

  // Emit the structures the routes would return/log (simulating handler output).
  console.log("[import] validation complete", { rows: rows.length, invalid: validated.filter((r) => !r.isValid).length });
  console.log("[import] error report:\n" + reportCsv);
  console.log("[import] errors payload:", JSON.stringify(errors));
  console.error("[employees/upload]"); // the route's actual catch log (no payload)

  check("produced by-reference errors (row/field/code)", errors.length > 0 && errors.every((e) => typeof e.row === "number" && !!e.field && !!e.code));

  // GREP every output surface for each sentinel.
  const haystacks = [
    ...captured,
    reportCsv,
    JSON.stringify(errors),
    JSON.stringify(validated.map((r) => ({ row: r.row, errors: r.errors, warnings: r.warnings, isValid: r.isValid }))), // structured results (NOT data)
  ];
  let hits = 0;
  for (const s of SENTINELS) {
    for (const h of haystacks) {
      if (h.includes(s)) { hits++; process.stdout.write(`  LEAK: sentinel ${s} found in output\n`); }
    }
  }
  check(`ZERO PII sentinels in errors/report/logs (hits=${hits})`, hits === 0);

  // Sanity: the sentinels DO still live in the parsed `data` (client preview only), proving
  // the grep would have caught a leak if the error path echoed values.
  const dataHasSentinel = validated.some((r) => JSON.stringify(r.data).includes(S.phone));
  check("control: sentinels present in row.data (so a leak WOULD be detected)", dataHasSentinel);

  process.stdout.write(`\nRESULT: ${pass ? "PASS" : "FAIL"}\n`);
  if (!pass) process.exit(1);
}
main();
