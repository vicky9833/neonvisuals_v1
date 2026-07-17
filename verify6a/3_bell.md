# Item 3 — Fix the bell (reads notifications, not reminders) — PASS

`NotificationBell.tsx` now fetches `/api/notifications` (own, unread-first) with an unread badge
and mark-as-read / mark-all-read; it no longer reads the `reminders` (email-dispatch) table. The
routes are thin RLS-scoped wrappers over the queries verified here via a real user JWT.
Evidence: `3_bell_run.txt`.

Fixtures: u1 with 3 notifications (2 unread, 1 read), u2 with 1 (isolation).

```
u1 sees ONLY own rows (RLS) — 3, not u2's                PASS
unread ordered before read (unread-first)               PASS   order: read_at NULLS FIRST, created_at DESC
unread count = 2                                          PASS
mark-as-read sets read_at                                PASS
unread count decremented to 1                            PASS
u2 CANNOT modify u1's notification (RLS)                  PASS   notifications_update_own
```

Routes added: `GET /api/notifications` (list + unread count), `PATCH /api/notifications` (mark all
read), `PATCH /api/notifications/[id]` (read/unread a single row). All user-scoped
(`requireApiAuth` + RLS `notifications_read` / `notifications_update_own`). Full deployed bell is
exercised in the preview/prod smoke.
