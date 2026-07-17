# Item 3 — Gift-chosen write + reversal (THE P6 obligation) — PASS

Evidence: `3_gift_chosen_run.txt`. Engine-layer proof (the tenant cancel path `updateQuoteStatus`
and `convertQuoteToOrder` use the cookie-bound server client, so the harness exercises the exact
helpers they wire: `writeGiftChosen`, `clearGiftChosenForQuote`, `markGiftOrderedForQuote`).

```
3a  request -> giftChosenFor TRUE; escalation SUPPRESSED (stages 2/3 don't fire)   PASS
3b  cancel (no order) -> gift-state CLEARED; giftChosenFor FALSE; escalation RESUMES (stage 2 fires) PASS
3c  convert -> gift-state marked ordered + order_id; cancel-reversal does NOT clear it;
    giftChosenFor STILL TRUE; escalation stays SUPPRESSED                          PASS
3d  survives occasion regeneration (new occasion.id, same stable identity)         PASS
residue gift_state = 0                                                             PASS
```

## Wiring
- **Request → suppress:** `requestQuote` (occasion-linked) calls `writeGiftChosen(admin, occasion,
  {quoteId, chosenBy})` → `occasion_gift_state(status='chosen')`. 6b `giftChosenFor()` → true →
  `runOccasionEscalation` returns `{suppressed:true}`.
- **Cancel/reject → resume:** `quote.updateQuoteStatus(id, 'cancelled'|'rejected')` calls
  `clearGiftChosenForQuote(admin, id)` — deletes gift-state rows for that quote **only when
  `order_id IS NULL`** (a fallen-through quote). `giftChosenFor()` → false → escalation resumes.
- **Convert → persist:** `order.convertQuoteToOrder` calls `markGiftOrderedForQuote(admin, quoteId,
  orderId)` → status='ordered' + order_id set. The cancel-reversal's `order_id IS NULL` guard means
  a committed gift is never cleared.
- **Regen-safe:** everything keys on `stableOccasionKey` (company:employee|cw:type:date[:title]),
  independent of the ephemeral `occasions.id`.

**The whole point holds: choosing a gift stops the ladder; a fallen-through quote re-arms it; a
committed (ordered) gift stays suppressed.**
