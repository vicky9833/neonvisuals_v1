# 3a Item 4 — Email events (Resend; email only)

## Implementation
- `src/lib/services/email-templates.ts` — `memberInviteTemplate({inviterName, role, acceptUrl})`
  and `memberJoinedTemplate({companyName, memberEmail})` (branded `baseTemplate`).
- `src/lib/services/email.ts` — `sendMemberInviteEmail(...)` (template `member_invite`) and
  `sendMemberJoinedEmail(...)` (template `member_joined`), following the existing `sendEmail`
  pattern (Resend + `email_log` write). Wired:
  - `POST /api/team/invites` fires `sendMemberInviteEmail` (invite link).
  - accept action (`invite/accept/actions.ts`) fires `sendMemberJoinedEmail` to owner/admins.
- **Does NOT write the `notifications` table** (that's Prompt 6) — email only.

## Evidence (real Resend ids + email_log rows)
From `_email_test_run.txt` (sent to Resend's test sink `delivered@resend.dev`):
```
member_invite: resend_id=5f202449-447b-4504-b529-677c73b57d5c status=sent
member_joined: resend_id=4fab504e-7567-4c3a-a5d6-f47308aec39c status=sent
email_log rows written: [
  {"template":"member_invite","resend_id":"5f202449-…","status":"sent","to_email":"delivered@resend.dev"},
  {"template":"member_joined","resend_id":"4fab504e-…","status":"sent","to_email":"delivered@resend.dev"}
]
RESIDUE email_log(t3a)= 0
```
Both events produced a real Resend id and a `sent` `email_log` row; test rows cleaned up
(residue 0).

## Method note (honest)
`email.ts` is `server-only` and imports via the `@/` alias, so it can't be imported under
`tsx`. The test therefore calls the **exact template functions** (pure) + the same Resend
send + `email_log` write shape that `sendEmail()` performs — i.e. it mirrors the senders
verbatim. The senders themselves are wired into the routes and are covered by tsc + build.
