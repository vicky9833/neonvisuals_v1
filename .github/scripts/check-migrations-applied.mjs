#!/usr/bin/env node
/**
 * Migration drift gate (Phase 0F).
 *
 * WHY THIS EXISTS: code depending on migration 059 shipped to production before 059 was applied,
 * and nothing caught it — Vercel green, CI green, tests green, order creation broken. This gate
 * makes that failure mode visible.
 *
 * WHY NOT compare repo files to the ledger: the Supabase ledger (supabase_migrations.schema_migrations)
 * stores CLI timestamps (e.g. 20260724120132) while repo files use NNN_ prefixes (058_...). They
 * cannot be matched by version string, so a naive "files vs ledger" diff would report all 59 as
 * pending — a check that cries wolf. Instead we verify the ACTUAL SCHEMA.
 *
 * DESIGN: baseline + forward probes (see .github/migration-manifest.json).
 *   Step A (repo-only, always runs): every migration file numbered > baseline MUST have a manifest
 *           entry. This forces each new migration to declare how its presence is verified, so a
 *           future migration cannot slip through unchecked.
 *   Step B (DB probes, needs a read-only credential): run each manifest probe against the live DB;
 *           FAIL naming any migration whose effect is absent.
 *
 * FALSE-POSITIVE behaviour: near zero. Probes read information_schema / pg_catalog for a specific
 *   artifact the migration creates; they do not depend on the drifted ledger or filenames.
 * FALSE-NEGATIVE behaviour: it does NOT verify migrations <= baseline (assumed applied, verified in
 *   Phase 0D; the live app runs on them). If a pre-baseline object were dropped out-of-band this gate
 *   would not notice — that is not the failure mode this guards (new code ahead of new schema).
 *
 * DB access is READ-ONLY (SELECT on system catalogs) via psql using the connection string in the
 * SUPABASE_DB_URL_RO secret. If that secret is absent (e.g. a fork PR), Step B SKIPS with a visible
 * warning — it never silently passes and never hard-fails CI for a missing credential.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const MANIFEST_PATH = join(HERE, "..", "migration-manifest.json");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");

function fail(msg) {
  console.error(`\n\u001b[31mMIGRATION DRIFT GATE FAILED\u001b[0m\n${msg}\n`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const baseline = Number(manifest.baseline);
const entries = manifest.migrations ?? {};

// ---------------------------------------------------------------------------
// Step A: every repo migration numbered > baseline must be declared in the manifest.
// ---------------------------------------------------------------------------
if (!existsSync(MIGRATIONS_DIR)) fail(`migrations dir not found: ${MIGRATIONS_DIR}`);
const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.*\.sql$/.test(f));
const undeclared = [];
for (const f of files) {
  const num = Number(f.slice(0, f.indexOf("_")));
  if (num > baseline) {
    const key = String(num).padStart(3, "0");
    if (!entries[key]) undeclared.push(f);
  }
}
if (undeclared.length > 0) {
  fail(
    `These migrations are above the manifest baseline (${baseline}) but have NO manifest entry:\n` +
      undeclared.map((f) => `  - ${f}`).join("\n") +
      `\n\nAdd an entry to .github/migration-manifest.json for each (a "probe" SQL returning a\n` +
      `single boolean that is TRUE once the migration is applied, or "dataOnly": true).`,
  );
}
const aboveBaseline = files.filter((f) => Number(f.slice(0, f.indexOf("_"))) > baseline).length;
console.log(`Step A OK: all ${aboveBaseline} migration file(s) above baseline ${baseline} are declared (of ${files.length} total).`);

// ---------------------------------------------------------------------------
// Step B: verify each declared probe against the live database (read-only).
// ---------------------------------------------------------------------------
const dbUrl = process.env.SUPABASE_DB_URL_RO;
if (!dbUrl) {
  console.warn(
    "\u001b[33m::warning::SUPABASE_DB_URL_RO is not set — SKIPPING the live migration-drift probes.\u001b[0m\n" +
      "This is expected on fork PRs (secrets are not shared with forks). On internal PRs/pushes, " +
      "configure the SUPABASE_DB_URL_RO repository secret (read-only Postgres connection string). " +
      "Step A (manifest completeness) still ran and passed.",
  );
  process.exit(0);
}

function runProbe(sql) {
  // -tAc: tuples-only, unaligned, single command. Returns 't' / 'f'.
  const out = execFileSync("psql", [dbUrl, "-tAc", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return out.trim();
}

const pending = [];
let verified = 0;
for (const [key, entry] of Object.entries(entries)) {
  if (Number(key) <= baseline) continue;
  if (entry.dataOnly === true) {
    console.log(`  - ${key}: dataOnly (no schema probe) — skipped.`);
    continue;
  }
  if (!entry.probe) {
    fail(`Manifest entry ${key} (${entry.file ?? "?"}) has neither a "probe" nor "dataOnly": true.`);
  }
  let result;
  try {
    result = runProbe(entry.probe);
  } catch (e) {
    // A connection/psql error is infra, not drift — fail loud and visibly, do not pass.
    const stderr = e?.stderr ? String(e.stderr).trim() : "";
    fail(
      `Could not run the probe for migration ${key} (${entry.file ?? "?"}).\n` +
        `psql error: ${stderr || e?.message || e}\n` +
        `Check the SUPABASE_DB_URL_RO secret and that psql is available on the runner.`,
    );
  }
  if (result === "t") {
    verified += 1;
    console.log(`  - ${key}: APPLIED (${entry.describes ?? entry.file})`);
  } else {
    pending.push({ key, entry, result });
  }
}

if (pending.length > 0) {
  fail(
    `The following repo migration(s) are NOT applied to the live database:\n` +
      pending
        .map(
          (p) =>
            `  - ${p.key}  ${p.entry.file ?? ""}\n` +
            `      ${p.entry.describes ?? ""}\n` +
            `      probe returned: '${p.result || "(no rows)"}' (expected 't')`,
        )
        .join("\n") +
      `\n\nWHAT TO DO: apply the migration to the hosted database BEFORE merging code that depends\n` +
      `on it. Do NOT run 'supabase db push' (banned — see MIGRATIONS.md). Apply the specific file\n` +
      `via the Supabase dashboard SQL editor (or the reviewed apply path in MIGRATIONS.md), then\n` +
      `re-run CI.`,
  );
}

console.log(`\nStep B OK: ${verified} migration(s) above baseline verified present in the live DB. No drift.`);
