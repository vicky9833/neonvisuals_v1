# Prompt 3b — Preview Smoke (DEPLOYED behavioural evidence)

- **Deployed SHA (behavioural)**: `c80d9fd` on branch `foundation`
- **Preview host**: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
- **Liveness confirmed before smoke**: `POST /api/team/transfer` flipped 404→401 on the branch alias → `c80d9fd` serving.
- **Method**: `x-vercel-protection-bypass` header + real GoTrue password-grant JWT SSR cookies (`sb-<ref>-auth-token=base64-…`). No service-role in any request path; admin client used only for fixture setup + row assertions.
- **Run log**: `verify3b/_preview_smoke_run.txt`
- **Result**: ALL CHECKS GREEN.

---

## Item 5 — Public surface / gate (no session, bypass only)

| Request | Result | Expected |
|---|---|---|
| `GET /` | 200 | 200 ✅ |
| `GET /products` | 200 | 200 ✅ |
| `GET /login` | 200 | 200 ✅ |
| `GET /register` | 200 | 200 ✅ |
| `GET /dashboard` | 307 → `/login?redirect=%2Fdashboard` | 307 w/ preserved redirect ✅ |
| `GET /nonexistent-xyz` | 403 (`route not on allowlist` body) | 403 default-deny ✅ |
| `POST /api/leads/capture` | 200 `{success:true}` | success ✅ |
| `POST /api/contact` | 200 `{received:true}` | received ✅ |

## Item 4 — Tenant page gating + isolation (`/dashboard/team`)

| Session | status | controls | read-only notice | lists own member | lists foreign |
|---|---|---|---|---|---|
| owner  | 200 | true  | false | true | false ✅ |
| viewer | 200 | false | true  | true | false ✅ |

Owner sees management controls (role select / "Make owner"); viewer sees the read-only roster notice and NO controls. Neither session leaks a foreign-company row.

## Item 1 — Last-owner guard → 409 on the DEPLOYED route (headline check)

```
owner DELETE self -> 409
body={"error":"last_owner","message":"Cannot remove the last owner — transfer ownership first."}
```

Confirmed **409 with a legible mapped body**, NOT a raw 500. The DB trigger's catchable `LAST_OWNER` message is surfaced through `mapGuard()` in `src/app/api/team/members/[userId]/route.ts`.

## Item 3 — Role edit + security-notice email on the DEPLOYED route

```
owner PATCH member (hr -> manager) -> 200 {"data":{"user_id":"70b799c0-…","role":"manager"}}
viewer PATCH (expect 403)          -> 403
role-changed email_log: [{"template":"member_role_changed","resend_id":"203fc872-568f-4411-8213-955d5ef4095e","status":"sent"}]
```

Real Resend id `203fc872-568f-4411-8213-955d5ef4095e`, status `sent`. Non-owner (viewer) PATCH correctly denied 403 by the matrix gate.

## Item 2 — Transfer atomicity on the DEPLOYED route

**before:**
```
owner   = 2257b41f-…  (org_owner)
viewer  = 3a7bc1de-…  (viewer)
member  = 70b799c0-…  (manager)
```

```
owner transfer(target=member) -> 200 {"data":{"companyId":"b04d7e2f-…"}}
```

**after:**
```
viewer  = 3a7bc1de-…  (viewer)
prior   = 2257b41f-…  (org_admin)   <- outgoing owner demoted
target  = 70b799c0-…  (org_owner)   <- new sole owner
owners (active org_owner count) = 1
```

```
NON-owner transfer (prior owner, now org_admin, target=viewer) -> 403
```

Exactly one active `org_owner` before and after; outgoing owner demoted to `org_admin`; `one_org_owner_per_company` satisfied throughout (never 2). Non-owner transfer denied.

---

## Residue teardown (zero)

- DB: MCP disable-trigger → delete `t3b_%` from `email_log`, `company_members`, `companies` → re-enable trigger. Verified `companies=0, members=0, email_log=0`.
- Leads: contact/leads-capture rows removed (`contact_email like 't3b_%' or contact_name like 't3b %' or company_name='QA'`). Verified `leads_residue=0`.
- Auth users: `_cleanup_users.mjs` deleted 3, remaining `t3b_` users = 0.
- Temp script `verify3b/_poll.ps1` deleted.

**Final residue check**: `leads=0, companies=0, members=0, email_log=0, auth users=0`.

---

## Verdict

All five acceptance items pass on **deployed** code (`c80d9fd`). Headline last-owner check returns a mapped **409** (not raw 500) — no promote-blocker. Holding on `foundation` for the promote call. **Not promoting to main.**
