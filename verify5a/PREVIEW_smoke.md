# Prompt 5a — Preview Smoke (DEPLOYED behavioural evidence)

- **Deployed SHA**: `ff2bd79` on `foundation` (5a build `f9c696e` + the two additions `ff2bd79`).
- **Preview host**: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
- **Method**: bypass token + real GoTrue JWT SSR cookies + supabase-js (PostgREST) for the cache check.
- **Liveness**: `GET /api/departments` (unauth) → **401** (was 404 pre-5a) → `ff2bd79` serving.
- **Run log**: `verify5a/_preview_smoke_run.txt`. **Result: ALL PASS.**

## Two additions folded in (migration 038)
- `festival_calendar.date_confidence` {verified,estimated} — 2027 Eid al-Fitr + Makar Sankranti = estimated; rest verified (30 verified).
- `occasion_types.lead_days_source` {spec,provisional} — 5 §4A person types = spec; 14 §4B/§4C = provisional.

## Item 1 — PostgREST schema cache reloaded (the flagged risk)
```
occasion_types resolves through REST API (no PGRST205)   PASS
occasions      resolves through REST API (no PGRST205)   PASS
departments    resolves through REST API (no PGRST205)   PASS
deployed GET /api/departments (owner) -> 200             PASS
```
The new tables resolve through the REST API (no PostgREST "relation not in cache" error) and the
departments route reads them — the cache reloaded (`NOTIFY pgrst,'reload schema'` after each DDL).

## Item 2 — departments → own-dept PII activation (deployed, headline)
```
owner create dept (Eng) -> 201 · assign manager -> 200 · create Eng+Design employees -> 201   PASS
manager reads Eng employee PII (own-dept, 4a RLS LIVE deployed, phone decrypts)                PASS
manager DENIED Design employee PII (stripped)                                                  PASS
Free company /api/departments -> 403 free_departments_blocked                                  PASS
viewer create dept -> 403 (not owner/admin)                                                    PASS
```
Via the deployed `/api/departments`: owner creates a dept + assigns a manager (sets
company_members.department_id) + assigns employees; the manager then reads own-dept employee PII
(decrypted) and is denied another dept's PII — 4a's own-dept RLS is **operative on real deployed
department data**. Pro-gated; non-owner/admin denied.

## Item 3 — festival seed visible
```
Diwali 2027 = 2027-10-29, lead 45, date_confidence=verified   PASS
festival calendar readable by a member (Free + Pro see it; Free=3 cap enforcement is 5b)   PASS
```

## Item 4 — occasion_types read-only for tenants
```
readable by tenant member       PASS
NOT writable by tenant (config) PASS   (member UPDATE affected 0 rows — platform-write RLS holds)
```

## Item 5 — no regression
```
finance PII stripped (§10) · owner sees PII      PASS
GET / 200 · /dashboard 307 · /nonexistent-xyz 403 PASS
/dashboard/team renders for owner (3b intact)     PASS
```
The existing reminders cron path was NOT modified by 5a (occasions.ts / /api/reminders/cron untouched).

## Residue teardown (zero)
occasions/company_festivals/employee_pii/employees + non-owner members deleted in-script;
owner-members + companies + 5 auth users via the MCP disable-trigger step + `_cleanup_users.mjs`.
Final: companies=0, occasions=0, departments(t5a)=0, t5a_ users=0.

## Verdict
Schema cache reloaded (new tables API-visible deployed), departments own-dept activation live on
real data, Diwali 2027 correct + confidence-tagged, occasion_types read-only, no regression.
Holding on `foundation` for the promote call. **Not promoted to main.**
