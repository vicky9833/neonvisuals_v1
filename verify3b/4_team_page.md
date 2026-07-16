# 3b Item 4 — /dashboard/team (tenant plane)

`src/app/(dashboard)/dashboard/team/page.tsx` — tenant team management (company_members), distinct
from `/ops/team` (platform_staff, untouched). Any member views the roster; management controls are
gated by `authorizeTenant(ctx, companyId, "members.change_role")` (the matrix, not ad-hoc checks).
Roster is scoped to the caller's OWN company (`companyId` derived from the verified membership).

## Evidence (real SSR cookie sessions, dev server) — from `_team_smoke_run.txt`
```
owner : status=200 controls=true  readOnlyNotice=false
viewer: status=200 controls=true=false readOnlyNotice=true
```
(rendered: owner sees the role `<select>` + "Make owner"/Remove controls; viewer sees the roster
with the "read-only access to the team roster" notice and no controls.)

- **owner/admin** (`members.change_role` = allow) → management controls rendered.
- **hr / finance / manager / viewer** → roster read-only, no controls.
- **Tenant isolation**: the roster query is `.eq("company_id", <caller's derived company>)` and
  `company_members_read` RLS also scopes reads to the caller's company — only own-company members
  are listed. Nav link added to the dashboard sidebar ("Team").
