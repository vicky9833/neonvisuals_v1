# 3b Item 5 — Role editor + remove-member

## Routes
- `PATCH /api/team/members/[userId]` — change role; `requireTenant("members.change_role")`
  (owner/admin); targets limited to `{org_admin, hr, finance, manager, viewer}` (org_owner NOT a
  target — ownership moves only via transfer). RLS `company_members_manage` + last-owner trigger
  are the invariants. Fires the §7 role-changed email (affected user + org_owner). `LAST_OWNER`
  mapped to a legible **409**.
- `DELETE /api/team/members/[userId]` — remove; `requireTenant("members.invite")`.

## Evidence (real SSR cookie sessions, dev server) — from `_team_smoke_run.txt`
```
owner PATCH role hr->manager: 200 {"data":{"user_id":"9221…","role":"manager"}}
viewer PATCH role -> (expect 403): 403
owner DELETE owner (self) -> (expect 409 last_owner): 409
   {"error":"last_owner","message":"Cannot remove the last owner — transfer ownership first."}
owner DELETE viewer -> (expect 200): 200 {"data":{"removed":"beb1…"}}
email_log member_role_changed: [{"resend_id":"f85a1e1e-1c00-4c1a-ba44-13033d66e26c",
   "status":"sent","to_email":"t3b_…_target@example.com, t3b_…_owner@example.com"}]
```
- **owner changes role** → 200, and a **real Resend id** + `email_log` row (`member_role_changed`,
  sent to affected user + org_owner). Email only — no `notifications`-table write.
- **non-owner (viewer)** → **403** (matrix denies `members.change_role`).
- **remove-member** works (200).
- **last-owner guard blocks the abusive path**: removing the sole owner via the route → **409**
  with the legible message. (Role-editor can't target `org_owner`, so it can't demote the owner
  at all; and any owner-removal is caught by the trigger.)
- All `t3b_` rows (users, company, members, email_log) cleaned up; residue 0.
