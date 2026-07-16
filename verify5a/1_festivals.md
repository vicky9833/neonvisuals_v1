# Item 1 — Festival calendar: extend + seed 2027 — PASS

## New columns (migration 034)
`festival_calendar` gained `region text`, `faith text`, `default_lead_days integer`.
Backfilled for all 2025+2026 rows; every row has a non-null `default_lead_days` (verified: 0 nulls).

## Lead times (§4D) applied
Diwali 45 · Holi 21 · Christmas 30 · New Year 30 · Eid al-Fitr 21 · Raksha Bandhan 14 ·
Ganesh Chaturthi 21 · Navratri 21 · Onam 21 · Makar Sankranti/Pongal 21 · Republic Day 14 ·
Independence Day 14.

## Diwali — the critical seed value
| Year | Date | Lead |
|------|------|------|
| 2025 | 2025-10-20 (pre-existing) | 45 |
| 2026 | 2026-11-08 (pre-existing) | 45 |
| **2027** | **2027-10-29** | **45** |

**Diwali 2027 = Friday, 29 October 2027.** SOURCES (4 concurring):
- diwali.info — "main celebration of Diwali (Lakshmi Puja) is on Friday, 29 October 2027"
- publicholidays.in/lakshmi-puja — "Friday 29 October in 2027"
- calendardate.com/diwali_2027 — "Friday October 29"
- when-is.com/diwali-2027 — 5-day festival starts 28 Oct (Lakshmi Puja 29th)
- Outlier noted & rejected: astrosight.ai said 8 Nov 2027 (inconsistent with its own series; contradicted by 4 sources). Content rephrased for compliance.

## Full 2027 seed (12 rows) + confidence
| Festival | 2027 date | Confidence / source |
|---|---|---|
| New Year | 2027-01-01 | fixed |
| Makar Sankranti / Pongal | 2027-01-14 | ⚠️ minor ±1 — calendarlabs shows Jan 15; seeded Jan 14 (matches existing 2025/26 rows + standard Makar Sankranti). Low stakes (T-21, small festival). |
| Republic Day | 2027-01-26 | fixed |
| Holi | 2027-03-22 | verified (abplive, lagna360, publicholidays.in, Quora) |
| Eid al-Fitr | 2027-03-09 | ⚠️ **ESTIMATED — moon-dependent** (time.now, officeholidays.com give Mar 9 "estimated"). Actual date subject to moon sighting ±1 day; description marks it estimated. |
| Raksha Bandhan | 2027-08-17 | verified (calendarlabs, publicholidays.in, calendardate.com) |
| Independence Day | 2027-08-15 | fixed |
| Ganesh Chaturthi | 2027-09-04 | verified (calendardate.com, qppstudio, outside.so; one outlier when-is Sep 3) |
| Onam | 2027-09-11 | sourced (publicholidays.in "Saturday 11 September") |
| Navratri | 2027-09-30 | sourced (calendardate.com "starts Thursday Sep 30") — start of 9-day festival |
| Diwali | 2027-10-29 | verified (4 sources, above) |
| Christmas | 2027-12-25 | fixed |

## ⚠️ FLAGGED for confirmation (STOP-for-decision)
1. **Eid al-Fitr 2027 (Mar 9)** — Islamic dates depend on moon sighting; this is the common
   pre-computed estimate. Confirm nearer the date (may shift ±1). Marked "estimated" in the row.
2. **Makar Sankranti 2027 (Jan 14 vs 15)** — seeded Jan 14; calendarlabs shows Jan 15. Minor ±1,
   low business stakes. Confirm if exactness matters.

All other 2027 dates are fixed-calendar or multi-source verified. Diwali 2027 (the business-critical
value) is confidently 29 Oct 2027.
