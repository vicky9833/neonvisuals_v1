# Item 4 — Fireable-now triggers through the engine — PASS

Evidence: `4_triggers_run.txt`.

## Occasion-at-lead-time (`notifyOccasionAtLeadTime`, wired in `/api/reminders/cron`)
```
tenant in-app -> hr, org_admin, org_owner, dept-manager (4)   PASS
platform in-app (occasion_ops) -> platform admin              PASS
tenant TITLE reference-style (no employee name)               PASS
tenant BODY may name the employee (authorised, RLS)           PASS
platform BODY has NO employee name (PII-safe)                 PASS
platform link = well-formed wa.me + client phone, no name     PASS
occasion in-app path fired NO email (channels_sent=[in_app])  PASS   (cron owns the company-contact email; no double-fire)
wa.me link omitted (null) when client has no phone            PASS
```
Wiring: the cron (after generateReminders) reads `occasions` where `notify_date = today` (precise
`occasion_type_key`) and calls `notifyOccasionAtLeadTime` per occasion — IN-APP only. The existing
occasion-reminder email to the company contact is preserved unchanged (no double-email).

## Membership lifecycle (in-app ADDED alongside existing emails)
```
role-change in-app -> affected user + org_owner              PASS
member-joined in-app -> org_owner + org_admin                PASS
```
Wired: invite created (`/api/team/invites`) → org_owner+org_admin; joined (`invite/accept`) →
org_owner+org_admin; role changed + removed (`/api/team/members/[userId]`) → affected user +
org_owner. The pre-existing Resend emails are UNCHANGED — the engine adds the in-app channel only,
so there is no parallel/duplicate email path.

## wa.me DIRECTION — ASSUMPTION (confirm)
Built per the stated assumption: link targets the CLIENT's `primary_contact_phone`, prefilled with
org context (org name, plan, business contact name, occasion TYPE — never employee PII), for an ops
person to tap and WhatsApp the client. Omitted gracefully when no client phone. Flip on request.
