# Item 5 — Festival Free=3 cap enforcement — PASS

`festivalLimit` (from 5a) is now WIRED at the opt-in write path
(`POST /api/occasions/festivals`): it computes the resulting active festival set
(existing active ∪ submitted-active − submitted-inactive); if `size > festivalLimit(planCtx)`
for a Free company → 403 `free_festival_limit` (upgrade reason). Pro/override/platform = unlimited.

Acceptance (`_cutover_cap.ts`, run `_cutover_cap_run.txt`):
```
festivalLimit Free = 3                                           PASS
festivalLimit Pro = unlimited                                    PASS
festivalLimit platform bypass = unlimited                        PASS
Free: 3 opted-in within cap                                      PASS
Free: 4th opted-in EXCEEDS cap (route returns 403 free_festival_limit)  PASS
```
Build-layer proves the gate function + the route's resulting-active-set computation. The deployed
route (403 on the 4th opt-in) is proven in the push+preview-smoke phase.
