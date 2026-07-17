# Item 1 — Stable occasion link on quotes + org_id standardization — PASS

Evidence: `1_occasion_link_run.txt`.

```
quote.occasion_key populated with the stable key                    PASS
occasion_gift_state row shares the quote's stable key               PASS
giftChosenFor(occasion) TRUE via the shared key (they JOIN)         PASS
quote persists occasion_key (stable, not occasions.id)              PASS
quotes.org_id no longer exists (renamed to _deprecated_org_id)      PASS
_deprecated_org_id exists (reversible)                              PASS
residue t7a_ companies = 0                                          PASS
```

- `quotes.occasion_key` stores `stableOccasionKey({company, employee|cw, type, date[, title]})` —
  the SAME shape `occasion_gift_state.stable_key` uses. A quote and its gift-state row therefore
  share identity and join; `giftChosenFor()` resolves via that key. **Never `occasions.id`** (which
  is regenerated each cron run → would orphan).
- org_id/company_id: redundant (both NULL, RLS uses company_id, org_id read by 2 dashboard queries
  only). Standardized on company_id; `org_id → _deprecated_org_id` (reversible; index follows).
