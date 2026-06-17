# Design Document

## Overview

This feature expands the Neon Visuals catalog from 8 to 11 public collections by
adding three new collections — **I (Events & General Gifts)**, **J (College
Events)**, and **K (Visiting Cards & Business Stationery)** — together with 29
new product SKUs, a homepage "time-saver" value-proposition section, brand-voice
and catalog-count copy updates, and a nullable `image_url` column on the
`products` table. Image processing is explicitly deferred until the source
images folder is provided.

The design honors four hard constraints from the requirements and steering:

1. **Additive only** — `ALTER` and `INSERT` statements exclusively. No table is
   dropped or recreated.
2. **RLS untouched** — the `FOR SELECT USING (true)` policies on `buckets` and
   `products` are not modified.
3. **Prices hidden** — the public site keeps reading from static no-price data
   files (`src/data/buckets.ts`, `src/data/products.ts`); price columns stay in
   the database for internal use only.
4. **Static/DB sync** — `src/data/buckets.ts` is updated to mirror the new
   database rows using the existing `Bucket` type.

The work touches three layers:

| Layer | Files | Change |
|---|---|---|
| Database | `supabase/migrations/003_add_collections_ijk.sql` (+ `004_seed_collections_ijk.sql`) | enum extension, bucket rows, `image_url` column, product rows |
| Static data | `src/data/buckets.ts` | add I/J/K entries, update header comment + Bucket F wording |
| Marketing UI | `src/app/(marketing)/page.tsx`, `src/app/(marketing)/products/page.tsx`, `src/components/marketing/corporate-tabs.tsx`, `src/data/occasions.ts` | time-saver section + copy updates |

All code examples use **TypeScript** (React 19 / Next.js 16, strict mode) and
**PostgreSQL** SQL, matching the detected stack.

---

## Architecture

### Component / data flow

```
                     supabase/migrations/
                     ├── 003_add_collections_ijk.sql   (enum: ADD VALUE I/J/K)   ── commits ──┐
                     └── 004_seed_collections_ijk.sql   (bucket rows, image_url, 29 products) ◄┘
                                   │
                                   ▼
                            buckets / products tables  (internal — prices live here)
                                   │  (mirrored by hand, no prices)
                                   ▼
                     src/data/buckets.ts  ──►  Bucket[] (public static layer)
                                   │
                                   ▼
        src/app/(marketing)/* pages  ──►  render collections, counts, copy, time-saver section
```

The public marketing pages never query the database for catalog content; they
import the static `BUCKETS` array and `PRODUCTS` array. This is the mechanism
that keeps prices hidden (Requirement 7.3): the static layer simply has no price
fields. The database seed therefore can carry internal pricing columns as `NULL`
without any risk of exposure.

### Migration ordering strategy (Requirement 1.2)

PostgreSQL forbids using a newly added enum value in the **same transaction**
that adds it (`ALTER TYPE ... ADD VALUE` must be committed before the value can
be referenced — otherwise the server raises *"unsafe use of new value of enum
type"*). The Supabase migration runner (`supabase db push` / local `supabase
migration up`) wraps **each migration file in its own transaction**.

Putting `ALTER TYPE bucket_code ADD VALUE 'I'` and `INSERT INTO buckets (code,
...) VALUES ('I', ...)` in one file would therefore fail.

**Recommended pragmatic approach: split across two migration files.** Because the
runner commits each file independently, the enum file commits before the seed
file executes, satisfying 1.2 cleanly and without fragile in-file `COMMIT`
hacks:

- **`003_add_collections_ijk.sql`** — contains only the three
  `ALTER TYPE bucket_code ADD VALUE` statements (the "enum batch"). Commits on
  its own.
- **`004_seed_collections_ijk.sql`** — contains the bucket-row inserts, the
  `ALTER TABLE products ADD COLUMN image_url`, and the 29 product inserts. Runs
  after 003 has committed, so `'I'/'J'/'K'` are safe to reference.

This still satisfies Requirement 7.4 (a new `003_*.sql` migration exists
alongside `001`/`002`); the `004_*.sql` companion is the safe-ordering split
called out in the feature request. If a single-file `003` is mandated by
tooling, the fallback is to run the enum statements with
`ALTER TYPE ... ADD VALUE IF NOT EXISTS` and document that the file must be
applied in two passes — but the two-file split is preferred and is what this
design specifies.

> Note: `ADD VALUE IF NOT EXISTS` is used on every enum addition so re-running
> the migration is idempotent and never errors if a value already exists.

---

## Migration design

### `003_add_collections_ijk.sql` — enum batch

```sql
-- =============================================================================
-- Neon Visuals — Add Collections I/J/K (003): enum extension ONLY.
-- Split from the seed (004) because a new enum value cannot be used in the
-- same transaction that adds it. This file commits first.
-- Additive only. RLS untouched.
-- =============================================================================

ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'I';
ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'J';
ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'K';
```

### `004_seed_collections_ijk.sql` — bucket rows, column, product rows

Structure (safe ordering preserved):

1. **(b) Bucket rows** — 3 `INSERT`s into `buckets`, matching the exact column
   set used by `seed.sql`:
   `code, name, slug, description, purpose, primary_buyer, asp_range_min,
   asp_range_max, icon, sort_order, seo_title, seo_description, is_active`.
   `ON CONFLICT (code) DO NOTHING` keeps the insert idempotent.
2. **(c) Products column** —
   `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`
3. **(d) Product rows** — 29 `INSERT`s using the established `seed.sql` product
   column pattern, with `bucket_id` resolved via
   `(SELECT id FROM buckets WHERE code = 'I')` etc.

Bucket-row values:

```sql
INSERT INTO buckets (code, name, slug, description, purpose, primary_buyer,
  asp_range_min, asp_range_max, icon, sort_order, seo_title, seo_description, is_active) VALUES
('I', 'Events & General Gifts', 'events-general',
 'Versatile gifting for conferences, town halls, and everyday corporate moments.',
 'Gifts for every event and everyday moment', 'Admin/HR/Events', NULL, NULL,
 'PartyPopper', 9,
 'Corporate Event & General Gifts | Neon Visuals',
 'Personalised gifts for conferences, town halls, and general corporate occasions — useful, on-brand, and never generic.', true),
('J', 'College Events', 'college-events',
 'Personalised merch and awards for fests, convocations, and campus programs.',
 'Campus events done memorably', 'College/Event Committee', NULL, NULL,
 'GraduationCap', 10,
 'College Event Gifts & Custom Merch | Neon Visuals',
 'Custom merch, awards, and kits for college fests, convocations, and campus events. Personalised at scale.', true),
('K', 'Visiting Cards & Business Stationery', 'visiting-cards',
 'Premium business cards and stationery that make a first impression count.',
 'A first impression worth keeping', 'Founders/Sales/Admin', NULL, NULL,
 'Contact', 11,
 'Premium Visiting Cards & Business Stationery | Neon Visuals',
 'Premium personalised visiting cards, letterheads, and business stationery designed for a lasting first impression.', true)
ON CONFLICT (code) DO NOTHING;
```

> `asp_range_min/max` are set to `NULL` (prices hidden — see below). `icon`
> values (`PartyPopper`, `GraduationCap`, `Contact`) are valid lucide-react
> icon names so the public collection cards can render an icon.

### Price-handling convention (Requirement 7.3, feature request)

`seed.sql` seeded the original A–H SKUs with real internal numbers
(`cogs`, `price_single`, `price_bulk_25`, `price_bulk_100`, `margin_percent`).
For the 29 **new** SKUs there is no pricing data, prices remain hidden, and all
price columns are **nullable** (verified against `001_initial_schema.sql` — none
of `cogs`, `price_single`, `price_bulk_25`, `price_bulk_100`, `margin_percent`
carries `NOT NULL`).

**Chosen convention: set all price/cost/margin columns to `NULL`** for the new
SKUs (not `0`). Rationale:

- `NULL` correctly means "not yet priced" rather than "free" — `0` would be a
  misleading sentinel and could surface as ₹0 in internal admin/quote tooling.
- It avoids fabricating numbers the business has not set.
- It is fully consistent with the public no-price guarantee (the public layer
  ignores these columns entirely).

`wow_score` **must** be populated because the DB has
`CHECK (wow_score BETWEEN 1 AND 10)`; each SKU below specifies a value in range.
`moq`, `lead_time_days`, `rush_lead_time_days` are set to reasonable
collection-level defaults (`moq` 10/25, `lead_time_days` 5–10) so internal
tooling has sane values; they are not exposed publicly.

### Product INSERT shape (matches `seed.sql`)

```sql
INSERT INTO products (sku, bucket_id, name, slug, tagline, description, who_is_it_for,
  insight, wow_score, cogs, price_single, price_bulk_25, price_bulk_100, margin_percent,
  lead_time_days, rush_lead_time_days, moq, materials, personalization_types, occasions,
  archetypes, tags, recommended_packaging, is_featured, is_bestseller, is_new, sort_order) VALUES
('NV-I01', (SELECT id FROM buckets WHERE code='I'), '3D Printed Photo Album',
 '3d-printed-photo-album', 'Memories in three dimensions',
 'Custom 3D-printed photo album perfect for farewells, anniversaries, and birthdays. Each album features a sculptural cover with the recipient''s name and occasion date, housing carefully curated photo prints inside.',
 '<who>', '<insight>',
 9, NULL, NULL, NULL, NULL, NULL, 7, 4, 25,
 ARRAY['pla','photo-paper'], ARRAY['print']::personalization_type[],
 ARRAY['farewell','birthday']::occasion_type[], ARRAY['root','connector']::employee_archetype[],
 ARRAY['trending','instagram-inspired','photo','keepsake','desk-test','use:anniversary','pers:name','pers:date','pers:photos'],
 'premium', false, false, true, 1),
 ... (28 more) ;
```

`image_url` is intentionally **omitted** from the INSERT column list, so it
defaults to `NULL` (Requirement 6.3).

---

## SKU mapping table (29 SKUs)

The `name`, `tagline`, and `description` for every SKU below are the **user's
exact verbatim product content** — they must be inserted character-for-character
(only doubling single quotes for SQL escaping). `wow_factor` from the source
content maps directly to the `wow_score` column. All price columns
(`cogs`, `price_single`, `price_bulk_25`, `price_bulk_100`, `margin_percent`) are
`NULL`; `image_url` is `NULL`.

The user-supplied content also carries `desk_test` (boolean), `category_tags`,
`use_cases`, and `personalisation` fields that have no 1:1 seed column. The
following **mapping rules** convert them onto the existing `products` columns
without losing any information and without violating any enum constraint. The
Tasks phase MUST follow these rules to produce valid SQL.

### Field-mapping rules

1. **`wow_factor` → `wow_score`** — copied directly (all values are within the
   `CHECK (wow_score BETWEEN 1 AND 10)` range).

2. **`use_cases` → `occasions[]` + `tags[]`** — `occasions[]` is an
   `occasion_type[]` column, so only values that are **valid enum members** may
   be inserted there. Each `use_cases` token is resolved against this whitelist;
   anything not on it is **preserved as a free-text tag** `use:<token>` in
   `tags[]` (lowercased, hyphens kept) so no information is lost and no enum
   constraint is violated:

   | source `use_cases` token | → `occasion_type` enum member |
   |---|---|
   | `farewell` | `farewell` |
   | `birthday` | `birthday` |
   | `offsite`, `team-event` | `team_offsite` |
   | `new-year` | `new_year` |
   | `onboarding`, `new-hire`, `orientation`, `CXO-onboarding` | `onboarding` |
   | `appreciation` | `client_appreciation` |
   | `company-anniversary` | `company_anniversary` |
   | `star-performer` | `spot_award` |
   | `general-gift`, `general`, `events` | `custom` |

   Every other token (e.g. `anniversary`, `desk-accessory`, `tech-team`,
   `premium-general`, `travel`, `wellness`, `budget`, `hackathon`, `sports-day`,
   `college-fest`, `cultural-event`, `winter-event`, `environment-day`,
   `new-academic-year`, `workshop`, `professional`, `rebranding`,
   `tech-companies`, `CXO`, `founder`, `founders`, `premium-professional`,
   `luxury-professional`, `eco-companies`, `CSR`, `networking`, `designers`,
   `creative-professionals`, `new-company`) becomes a `use:<token>` tag.
   Where a SKU has **no** whitelisted token (most of Collections J and K),
   `occasions[]` is set to `ARRAY['custom']` so the column is meaningful.

3. **`personalisation` → `personalization_types[]` + `tags[]`** — the
   `personalization_type` enum describes a **production technique**
   (`laser_engrave, print, emboss, deboss, sublimation, dtf, embroidery,
   uv_print`), whereas the source `personalisation` tokens are mostly **content
   to be applied** (name, date, logo, photos). So:
   - The technique is **inferred from the verbatim description / token** and
     mapped to enum members:
     `engrave(d)/engraved-name(plate)-on-base/laser-engraved → laser_engrave`,
     `embroider(y)/embroidered/name embroidery → embroidery`,
     `DTF → dtf`, `screen print/printed/custom-printed/branding → print`,
     `UV / spot UV / UV-printed → uv_print`, `letterpress/deboss → deboss`,
     `photo prints → print`. When no technique is stated, default to `print`.
   - Each literal content token (`name`, `date`, `photos`, `logo`,
     `event-name`, `colour`, `initials`, `message`, `event-design`,
     `team-names`, `designation`, `contact`, `company-branding`,
     `digital-profile-link`, `seed-type`, etc.) is **preserved verbatim** as a
     `pers:<token>` tag in `tags[]`, so the descriptive personalisation intent
     is never lost even though it has no enum slot.

4. **`category_tags` + `desk_test` → `tags[]`** — all `category_tags` are copied
   verbatim into `tags[]`. When `desk_test` is `true`, the literal tag
   `desk-test` is appended. (Collections J and K supply no `desk_test` field, so
   no `desk-test` tag is added for those SKUs.)

5. **`archetypes[]`** — not supplied by the user; authored per SKU from the
   `employee_archetype` enum (broad-appeal pairs), same as the original A–H seed.

6. **`recommended_packaging`** — derived from `wow_score` using the
   `packaging_tier` enum: `10 → flagship`, `7–9 → premium`, `5–6 → standard`,
   `≤4 → budget` (apparel items biased one tier down toward `standard`).

7. **`who_is_it_for` / `insight`** — authored per SKU in the migration in the
   same brand voice as `seed.sql` (the descriptive `pers:`/`use:` tags above may
   also seed `who_is_it_for` phrasing where a content token does not fit an
   enum).

> Net effect: `occasions[]` and `personalization_types[]` contain **only valid
> enum members**; everything that cannot map to an enum is retained losslessly
> as a `use:` or `pers:` prefixed entry in the free-text `tags[]` array.

### Resolved per-SKU values

Each table gives the verbatim `name`/`tagline`, the `wow_score`, the resolved
enum-safe `personalization_types` and `occasions`, and the full `tags[]` array
(category_tags + `desk-test` + `use:` + `pers:` entries). Verbatim descriptions
follow each table.

### Collection I — Events & General Gifts (NV-I01–NV-I13)

| SKU | Name (verbatim) | Tagline (verbatim) | Wow | personalization_types (enum) | occasions (enum) | tags[] |
|---|---|---|---|---|---|---|
| NV-I01 | 3D Printed Photo Album | Memories in three dimensions | 9 | `print` | `farewell`, `birthday` | trending, instagram-inspired, photo, keepsake, desk-test, use:anniversary, pers:name, pers:date, pers:photos |
| NV-I02 | Instant Fridge Magnet Set | Stick the memories where you'll see them daily | 6 | `print` | `team_offsite`, `farewell` | fun, budget-friendly, photo, use:team-event, pers:photos, pers:name, pers:event-name |
| NV-I03 | 3D Printed Calendar (Never-Expiring) | A calendar that never goes out of date | 8 | `print` | `custom`, `new_year` | trending, instagram-inspired, desk, perpetual, desk-test, use:desk-accessory, pers:name, pers:logo |
| NV-I04 | Magnetic Fluid Bluetooth Speaker | Sound meets science — mesmerising desk art that plays music | 10 | `laser_engrave`, `print` | `spot_award` | trending, viral, tech, instagram-inspired, desk-test, use:tech-team, use:premium-general, pers:logo, pers:engraved-name-on-base |
| NV-I05 | Collapsible Silicone Bottle | Full-size hydration, pocket-size convenience | 6 | `print` | `custom` | practical, travel, eco-friendly, use:travel, use:wellness, pers:name, pers:logo, pers:colour |
| NV-I06 | Water Bottle with Built-in Phone Stand | Hydrate and hands-free — two essentials in one | 7 | `laser_engrave` | `onboarding`, `custom` | trending, practical, dual-purpose, desk-test, use:desk-accessory, pers:name, pers:logo |
| NV-I07 | Foldable Silicone Phone Stand | Your phone's favourite resting place | 5 | `print` | `custom` | budget-friendly, practical, travel, desk-test, use:budget, use:travel, pers:name, pers:initials |
| NV-I08 | Book Lamp (Foldable) | A book that lights up the room — literally | 9 | `laser_engrave` | `farewell`, `client_appreciation` | trending, viral, instagram-inspired, decor, desk-test, use:premium-general, pers:name, pers:message, pers:logo |
| NV-I09 | Jellyfish Mood Lamp | Mesmerising motion for mindful desks | 9 | `laser_engrave` | `client_appreciation` | trending, viral, wellness, decor, desk-test, use:premium-general, use:wellness, pers:engraved-nameplate-on-base |
| NV-I10 | Travelling Dispenser Kit | Organised essentials for the corporate traveller | 5 | `embroidery` | `team_offsite`, `custom` | practical, travel, use:travel, pers:name, pers:logo |
| NV-I11 | Desk Organiser Kit | Declutter the desk, elevate the vibe | 7 | `laser_engrave` | `onboarding`, `custom` | practical, desk, organisation, desk-test, use:desk-accessory, pers:name, pers:logo |
| NV-I12 | Event T-Shirt / Hoodie | Wear the moment, remember the team | 7 | `dtf`, `print` | `team_offsite`, `company_anniversary` | apparel, team-identity, use:hackathon, use:team-event, pers:name, pers:event-design, pers:team-names |
| NV-I13 | Custom Cap (Embroidered) | Top off the team spirit | 5 | `embroidery` | `team_offsite` | apparel, team-identity, budget-friendly, use:sports-day, use:team-event, pers:logo, pers:name, pers:event-text |

**Verbatim descriptions (Collection I):**

- **NV-I01** — "Custom 3D-printed photo album perfect for farewells, anniversaries, and birthdays. Each album features a sculptural cover with the recipient's name and occasion date, housing carefully curated photo prints inside."
- **NV-I02** — "Custom-printed fridge magnets featuring team photos, event moments, or personalised illustrations. Premium magnetic backing with glossy/matte finish options."
- **NV-I03** — "Instagram-inspired perpetual desk calendar with 3D-printed geometric design. Manually adjustable date blocks that work year after year. Personalised with name and company logo."
- **NV-I04** — "Ferrofluid dancing speaker that creates mesmerising liquid patterns synced to music. A conversation-starter desk piece that doubles as a premium Bluetooth speaker. Branded with subtle logo placement."
- **NV-I05** — "BPA-free collapsible silicone water bottle that folds flat when empty. Perfect for travel, gym, and daily commute. Available in brand colours with name printing."
- **NV-I06** — "Innovative stainless steel bottle with integrated phone stand on the cap. Perfect desk companion for video calls and daily hydration. Name engraved on body."
- **NV-I07** — "Ultra-portable foldable phone stand in premium silicone. Adjustable angles, works with any phone, collapses flat for travel. Personalised with name or initials."
- **NV-I08** — "Instagram-viral wooden book lamp that opens to reveal warm LED pages. Folds flat like a real book, opens 360° into a stunning lamp. Magnetic closure. Logo or name on cover via laser engraving."
- **NV-I09** — "Colour-changing LED jellyfish aquarium lamp. Lifelike silicone jellyfish float in a sealed tank with soothing colour transitions. A premium desk piece that reduces stress and sparks conversation."
- **NV-I10** — "Compact travel-sized dispenser set for toiletries in a branded pouch. TSA-friendly sizes, leak-proof, reusable. Personalised pouch with name embroidery."
- **NV-I11** — "Multi-compartment desk organiser in premium wood or acrylic. Holds pens, phone, cards, sticky notes, and small accessories. Laser-engraved name on front panel."
- **NV-I12** — "Custom-designed event tees and hoodies with event name, date, and team member names. Premium cotton, DTF/screen print. Available in crew neck, V-neck, and hoodie options."
- **NV-I13** — "Premium structured cap with embroidered logo and optional name on the side/back. Adjustable strap, breathable fabric. Perfect for offsites, sports days, and team identity."

### Collection J — College Events (NV-J01–NV-J08)

> Collection J supplies no `desk_test` field, so no `desk-test` tag is added.
> None of its `use_cases` are whitelisted occasion enum members except
> `orientation → onboarding`; SKUs with no whitelisted token use
> `occasions = ARRAY['custom']`.

| SKU | Name (verbatim) | Tagline (verbatim) | Wow | personalization_types (enum) | occasions (enum) | tags[] |
|---|---|---|---|---|---|---|
| NV-J01 | College Fest T-Shirt | The tee that becomes the memory | 7 | `dtf` | `custom` | apparel, college, volume, use:college-fest, use:hackathon, use:cultural-event, pers:event-design, pers:college-logo, pers:participant-name-optional |
| NV-J02 | College Event Hoodie | Cosy campus memories | 8 | `embroidery`, `dtf` | `custom` | apparel, college, premium, use:college-fest, use:hackathon, use:winter-event, pers:event-design, pers:college-logo |
| NV-J03 | Event Cap | Cap the experience | 5 | `embroidery` | `onboarding` | apparel, college, budget-friendly, use:sports-day, use:college-fest, pers:logo, pers:event-text |
| NV-J04 | Custom Tote Bag | Carry the campus vibe everywhere | 5 | `print` | `onboarding` | eco-friendly, college, practical, use:college-fest, use:hackathon, pers:event-design, pers:college-logo |
| NV-J05 | Flexible Phone Stand | Bendy, fun, and endlessly useful | 6 | `print` | `custom` | budget-friendly, tech, fun, use:college-fest, use:hackathon, pers:logo, pers:colour |
| NV-J06 | Eco-Friendly Kit (Bamboo Pen + Seed Paper Notebook + Jute Pouch) | Green gifts for the next generation | 7 | `print` | `onboarding` | eco-friendly, college, kit, use:environment-day, use:college-fest, pers:college-logo, pers:event-name |
| NV-J07 | Student Diary + Pen Combo | Plan the future, one page at a time | 6 | `print` | `onboarding` | stationery, college, practical, use:new-academic-year, use:hackathon, pers:college-logo, pers:year, pers:student-name-optional |
| NV-J08 | College Notebook (Ruled/Blank) | Notes worth keeping | 4 | `print` | `onboarding`, `custom` | stationery, college, budget-friendly, use:workshop, pers:cover-design, pers:college-logo |

**Verbatim descriptions (Collection J):**

- **NV-J01** — "Custom-designed fest/event t-shirt in premium 190 GSM cotton. Full-colour DTF print with event branding, date, and college identity. Bulk-friendly pricing without compromising print quality."
- **NV-J02** — "Premium 300 GSM fleece hoodie with event/college branding. Embroidered or DTF print. The hoodie students actually keep wearing years after graduation."
- **NV-J03** — "Structured cotton cap with embroidered college/event logo. Adjustable back strap. Available in 10+ colours. Bulk-order friendly."
- **NV-J04** — "Heavy-duty canvas tote with screen-printed event art. Reinforced handles, internal pocket. Doubles as a daily-use bag long after the event."
- **NV-J05** — "Flexible octopus-style phone holder that wraps around anything. Fun colours, compact, and universally useful. Branded with event/college logo."
- **NV-J06** — "Sustainability-focused combo kit: bamboo pen, plantable seed paper notebook, packed in a printed jute pouch. Perfect for eco-conscious campus events."
- **NV-J07** — "A5 hardbound diary with academic year calendar, goal-setting pages, and college branding. Paired with a matching wooden/bamboo pen. Budget-friendly for large batches."
- **NV-J08** — "Quality spiral or stitched notebook with custom-printed cover featuring event/college artwork. 80 GSM acid-free paper. Available in ruled, blank, and dot-grid."

### Collection K — Visiting Cards & Business Stationery (NV-K01–NV-K08)

> Collection K supplies no `desk_test` field, so no `desk-test` tag is added.
> Only `new-hire`/`rebranding`-adjacent and `CXO-onboarding → onboarding` map to
> the occasion enum; all other professional `use_cases` are kept as `use:` tags
> and SKUs without a whitelisted token use `occasions = ARRAY['custom']`.

| SKU | Name (verbatim) | Tagline (verbatim) | Wow | personalization_types (enum) | occasions (enum) | tags[] |
|---|---|---|---|---|---|---|
| NV-K01 | Premium Visiting Card (Matte + Spot UV) | The handshake before the handshake | 6 | `uv_print`, `print` | `onboarding` | stationery, professional, classic, use:professional, use:rebranding, pers:name, pers:designation, pers:contact, pers:company-branding |
| NV-K02 | NFC Smart Business Card | Tap. Connect. Impress. | 9 | `print` | `custom` | tech-forward, premium, smart, networking, use:professional, use:tech-companies, use:events, use:cxo, pers:name, pers:designation, pers:digital-profile-link, pers:company-branding |
| NV-K03 | Letterpress Visiting Card (Cotton Stock) | Feel the impression before you read the name | 9 | `deboss` | `custom` | luxury, tactile, artisan, premium, use:cxo, use:founder, use:premium-professional, pers:name, pers:designation, pers:contact, pers:company-branding |
| NV-K04 | Metal Business Card (SS/Brass) | A card they'll never throw away | 10 | `laser_engrave` | `custom` | luxury, metal, statement, premium, use:cxo, use:founder, use:luxury-professional, pers:name, pers:designation, pers:contact, pers:laser-engraved |
| NV-K05 | Seed Paper Visiting Card | Plant the connection | 7 | `print` | `custom` | eco-friendly, plantable, sustainable, use:eco-companies, use:csr, use:networking, pers:name, pers:designation, pers:contact, pers:seed-type |
| NV-K06 | Transparent Acrylic Card | Crystal clear first impression | 8 | `uv_print` | `custom` | modern, standout, creative, use:tech-companies, use:designers, use:creative-professionals, pers:name, pers:designation, pers:contact, pers:company-branding |
| NV-K07 | Wooden Visiting Card (Laser-Engraved) | Rooted in craftsmanship | 8 | `laser_engrave` | `custom` | eco-friendly, artisan, unique, use:eco-companies, use:creative-professionals, use:founders, pers:name, pers:designation, pers:contact, pers:laser-engraved |
| NV-K08 | Business Stationery Kit (Cards + Letterhead + Envelope) | Your complete brand identity, boxed | 7 | `print` | `onboarding` | professional, complete-suite, branding, use:new-company, use:rebranding, pers:full-company-branding, pers:name, pers:designation |

**Verbatim descriptions (Collection K):**

- **NV-K01** — "350 GSM art card with matte lamination and spot UV on logo/name. Clean, professional, tactile. The industry standard elevated with premium finishing."
- **NV-K02** — "Premium PVC or metal-finish card with embedded NFC chip. Tap any phone to instantly share your digital profile, LinkedIn, portfolio, or vCard. No app needed. The future of networking."
- **NV-K03** — "600 GSM cotton stock with deep-debossed letterpress printing. Tactile luxury that people keep in their wallets instead of throwing away. For founders and CXOs who believe details matter."
- **NV-K04** — "Laser-engraved stainless steel or brass business card. Mirror or matte finish. Arrives in a velvet sleeve. A statement piece for leaders who want to be remembered."
- **NV-K05** — "Handmade seed paper card embedded with wildflower or basil seeds. After use, plant it and watch it grow. Perfect for sustainability-focused companies and ESG-conscious professionals."
- **NV-K06** — "Frosted or clear acrylic card with UV-printed details. Modern, standout, and impossible to ignore in a stack of paper cards. Comes in a protective sleeve."
- **NV-K07** — "Thin-cut premium wood veneer card with laser-engraved details. Natural grain makes every card unique. Sustainable, memorable, conversation-starting."
- **NV-K08** — "Full stationery suite: 200 visiting cards + 50 letterheads + 50 envelopes, all in matching premium paper stock with consistent brand design. Delivered in a branded keepsake box."

`sort_order` within each collection follows the row order above (1..n).
`recommended_packaging` is derived from `wow_score` per rule 6 above (e.g.
`NV-I04`/`NV-K04` → `flagship`; mid-wow items → `premium`/`standard`; `NV-J08` →
`budget`). `archetypes` are drawn from the `employee_archetype` enum.
`who_is_it_for` and `insight` are authored per SKU in the migration in the same
voice as `seed.sql`. The `name`, `tagline`, and `description` are inserted
exactly as given by the user (single quotes doubled for SQL escaping only).

---

## `src/data/buckets.ts` update (Requirement 2)

The `Bucket` type (`src/lib/types/product.ts`) currently is:

```ts
export type BucketCode = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface Bucket {
  code: BucketCode;
  name: string;
  slug: string;
  purpose: string;
  primaryBuyer: string;
  description?: string;
  aspRangeMin?: number;
  aspRangeMax?: number;
  icon?: string; // lucide-react icon name
}
```

**Type change required:** `BucketCode` must be widened to include the new codes,
otherwise the new entries will not type-check (strict mode, no `any`):

```ts
export type BucketCode =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"
  | "I" | "J" | "K";
```

The mirror type `BucketCodeEnum` in `src/lib/types/database.ts` is widened the
same way for DB-row typing consistency.

**New entries appended to `BUCKETS`** (after the existing H entry, preserving
A–H exactly — Requirement 2.3). Shape matches existing entries exactly; `purpose`
and `primaryBuyer` are required and populated; `aspRangeMin/Max` are omitted
(optional) because prices are hidden:

```ts
  {
    code: "I",
    name: "Events & General Gifts",
    slug: "events-general",
    purpose: "Gifts for every event and everyday moment",
    primaryBuyer: "Admin/HR/Events",
    description:
      "Versatile gifting for conferences, town halls, and everyday corporate moments.",
    icon: "PartyPopper",
  },
  {
    code: "J",
    name: "College Events",
    slug: "college-events",
    purpose: "Campus events done memorably",
    primaryBuyer: "College/Event Committee",
    description:
      "Personalised merch and awards for fests, convocations, and campus programs.",
    icon: "GraduationCap",
  },
  {
    code: "K",
    name: "Visiting Cards & Business Stationery",
    slug: "visiting-cards",
    purpose: "A first impression worth keeping",
    primaryBuyer: "Founders/Sales/Admin",
    description:
      "Premium business cards and stationery that make a first impression count.",
    icon: "Contact",
  },
```

The `code`, `name`, `slug`, and `sort_order` (encoded as array position 9/10/11)
match the DB rows exactly (Requirement 2.1).

---

## Homepage Time-Saver section (Requirement 4)

### Placement

`src/app/(marketing)/page.tsx` renders sections in this order:
HERO → FEATURES → CATEGORIES → THE PROBLEM → FEATURED PRODUCTS → divider →
**HOW IT WORKS** → CORPORATE SOLUTIONS → UNBOXING → **TESTIMONIALS** → CTA.

The Time-Saver section is inserted **immediately after the HOW IT WORKS
`</section>` and before the CORPORATE SOLUTIONS section** — i.e. after
how_it_works and before testimonials, as required (it sits ahead of the
testimonials block; the intervening Corporate Solutions/Unboxing sections still
precede testimonials, so "after how_it_works and before testimonials" holds).

> If strict adjacency to testimonials is desired, the section can instead be
> placed directly before the `{/* TESTIMONIALS */}` block. Either position
> satisfies AC 4.1; this design uses the post–how-it-works slot to keep the
> value-prop narrative next to the process explanation.

### Data (inline-array pattern, matching existing `FEATURES`/`STEPS`)

```tsx
// Added to the lucide-react import: SearchX, ClipboardCheck, Clock, Sparkles
// (Sparkles is already imported)
const TIME_SAVERS = [
  {
    icon: SearchX,
    title: "No Endless Scrolling",
    desc: "Skip the catalogue rabbit hole. Tell us the occasion and team size — we shortlist what actually fits.",
  },
  {
    icon: ClipboardCheck,
    title: "One Brief, Done",
    desc: "Share the details once. We handle selection, personalisation, and packaging end to end.",
  },
  {
    icon: Clock,
    title: "Hours Back Every Week",
    desc: "No vendor chasing, no sample chaos. Your gifting runs in the background while you do your job.",
  },
  {
    icon: Sparkles,
    title: "Consistently On-Brand",
    desc: "Every gift looks intentional and premium — without you reviewing a single proof by hand.",
  },
] as const;
```

(The card icon set uses `SearchX` for the first card; `Ban` is the alternate
suggested in the request — either communicates "stop the busywork". `SearchX`
is chosen as it maps more directly to "no endless searching".)

### JSX structure (brand styling + `Reveal`)

```tsx
{/* TIME-SAVER / VALUE PROPOSITION */}
<section className="bg-background py-24">
  <div className="mx-auto max-w-[1200px] px-6">
    <Reveal>
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-1.5 text-[13px] font-medium text-navy shadow-sm">
          <span className="text-gold">✦</span> Built to save you time
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
          Gifting That Runs <span className="text-gold">Without You</span>
        </h2>
        <p className="mt-4 text-lg text-[#666666]">
          You have a hundred things to own. Employee gifting shouldn&apos;t be
          one of them. We take the brief and return the result.
        </p>
      </div>
    </Reveal>

    <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {TIME_SAVERS.map((item, i) => (
        <Reveal key={item.title} delay={(i % 4) * 80}>
          <div className="h-full rounded-xl border border-[#E5E2DC] bg-[#F5F0E8] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
            <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold">
              <item.icon className="size-6" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-[#1A1A1A]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#666666]">
              {item.desc}
            </p>
          </div>
        </Reveal>
      ))}
    </div>

    <Reveal className="mt-12">
      <div className="flex justify-center">
        <Link
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            "Hi, I'd like to save time on my company's gifting. Can you help?",
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
        >
          <MessageCircle className="size-4" /> Save Hours — Chat on WhatsApp
        </Link>
      </div>
    </Reveal>
  </div>
</section>
```

This follows AC 4.2 (4 cards with heading + body), AC 4.3 (bottom CTA with label
+ WhatsApp destination using the existing `WHATSAPP_NUMBER` constant), AC 4.4
(inline-array map + `Reveal` fade-in), and AC 4.5 (cream cards `#F5F0E8`, warm
border `#E5E2DC`, navy/gold icon chip, Playfair/DM Sans typography via existing
classes, badge styling reused from the hero).

`SearchX`, `ClipboardCheck`, and `Clock` are added to the existing
`lucide-react` import block (`Sparkles` and `MessageCircle` are already
imported).

---

## Copy-update inventory (Requirement 5)

Precise occurrences located via grep. Each row lists the file, the anchor line,
the current text, and the replacement.

### 5.1 — "8 collections / 8 buckets" → "11 collections"

| File | Location | Current | New |
|---|---|---|---|
| `supabase/seed.sql` | line 3 (header comment) | `-- 8 buckets, Bucket A (17 SKUs) + representative B–H products, festivals.` | `-- 11 collections, Bucket A (17 SKUs) + representative B–K products, festivals.` |
| `src/data/buckets.ts` | line 5 (header comment) | `* The 8 product buckets (A–H). Matches supabase/seed.sql. ...` | `* The 11 collections (A–K). Matches supabase/seed.sql. ...` |

> No public-facing rendered string currently says "8 collections"/"8 buckets";
> the only hits are code comments. They are still updated for accuracy.

### 5.2 — "100+ products" → "130+ products"

| File | Location | Current | New |
|---|---|---|---|
| `src/app/(marketing)/products/page.tsx` | line 9–10 (metadata description) | `"Explore 100+ premium, personalisable corporate gifting SKUs across onboarding, milestones, leadership, festive, and eco lines."` | `"Explore 130+ premium, personalisable corporate gifting SKUs across onboarding, milestones, leadership, festive, events, campus, and eco lines."` |

### 5.3 — "Bucket" → "Collection" (public-facing copy only)

| File | Location | Current | New | Notes |
|---|---|---|---|---|
| `src/data/buckets.ts` | header comment | "product buckets" | "collections" | comment, public-data file |
| `src/data/occasions.ts` | line ~119 | `"Our Sustainability bucket includes seed-paper cards..."` | `"Our Sustainability collection includes seed-paper cards..."` | rendered FAQ answer |

> Internal/code identifiers that contain "bucket" are **left unchanged** —
> `BucketCode`, `Bucket` interface, `BUCKETS`, `bucket_code` enum, `bucket_id`,
> `STORAGE_BUCKETS`, `filter-store.ts` `bucket` field, `recommendation.ts`
> `bucket` query field, and the `[slug]/page.tsx` local `bucket` variable. These
> are not public-facing copy; AC 5.3 scopes the change to "public-facing copy".

### 5.4 — "Hamper" → "Experience Kit" (public-facing copy)

| File | Location | Current | New |
|---|---|---|---|
| `src/data/buckets.ts` | Bucket F `description` | `"Multi-item flagship hampers that tell a complete story."` | `"Multi-item flagship experience kits that tell a complete story."` |
| `supabase/seed.sql` | line 15 (Bucket F row) | `'Multi-item flagship hampers that tell a complete story.'` | `'Multi-item flagship experience kits that tell a complete story.'` |
| `src/data/occasions.ts` | line ~106 (Diwali seoDescription) | `"Not generic hampers — individually named..."` | `"Not generic experience kits — individually named..."` |
| `src/components/marketing/corporate-tabs.tsx` | line ~28 | `"...not a generic hamper from a catalogue."` | `"...not a generic experience kit from a catalogue."` |

> The product `tags` value `'hamper'` and product *names* containing "Hamper"
> (e.g. `Boardroom Hamper`, `Festive Candle Hamper`) in `seed.sql` are **not**
> changed in this feature — they are seeded product identities/slugs, and the
> request scopes the swap to descriptive UI copy. This is flagged here so the
> Tasks phase can confirm scope; default is to leave product names/slugs/tags
> untouched to avoid breaking slugs and existing product references.

### 5.5 — "Cost" → "Investment" (public-facing copy)

| File | Location | Current | New |
|---|---|---|---|
| `src/app/(marketing)/page.tsx` | line ~99 (`MOST_COMPANIES` array) | `"Cost measured per unit, not per memory created"` | `"Investment measured per unit, not per memory created"` |

> `src/app/(marketing)/page.tsx` line ~142 (`JOURNAL`): `"The True Cost of
> Generic Corporate Gifts"` is a **blog post title** tied to the slug
> `true-cost-of-generic-corporate-gifts`. Changing the visible title would
> desync it from the slug and any published article. **Left unchanged**;
> flagged for explicit confirmation in Tasks.
>
> Code comments using "cost" (`constants.ts` "packaging cost", `pricing.ts`
> "packaging cost", `memory.ts` "switching-cost") are internal and unchanged.

---

## Image processing — DEFERRED (Requirement 6)

This feature only **prepares** for images:

- `004_seed_collections_ijk.sql` adds `image_url TEXT` (nullable) via
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`
- The existing `images TEXT[]` and `thumbnail_url TEXT` columns are **not**
  touched (AC 6.2).
- All 29 new product rows leave `image_url` as `NULL` (AC 6.3).

### Future plan (BLOCKED — do not start without user input)

> **DEFERRED — gated on user providing the source images folder (AC 6.4).**
> A follow-up task must first request the images folder from the user. No upload
> or mapping happens until that folder is provided.

Planned steps once unblocked:

1. **Request & receive** the source images folder from the user.
2. **Map** each image to its SKU by filename convention (e.g. `NV-I01.jpg`) or a
   provided manifest.
3. **Upload** images to the Supabase Storage `product-images` bucket (the
   `src/lib/services/storage.ts` `STORAGE_BUCKETS` map currently exposes
   `products`; confirm/add a `product-images` bucket name as part of that task).
4. **Set `image_url`** on each product to the public Storage URL via
   `publicStorageUrl(...)`.
5. **(Optional) responsive variants** — generate/resize variants and store
   alongside, or rely on `next/image` with `remotePatterns` configured for the
   Supabase domain.
6. Update the public static `products` data and the catalog UI to render images
   with required `next/image` `alt`/`width`/`height`.

---

## Components and Interfaces

This feature has no new runtime services or APIs — it is a catalog data + static
content change. The "components" are the data structures and the one UI block
that are added or modified.

### `Bucket` (existing interface, unchanged shape)

`src/lib/types/product.ts` — the public collection contract. New entries must
satisfy it; `code` is the only widened member.

```ts
export type BucketCode =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H"
  | "I" | "J" | "K"; // widened

export interface Bucket {
  code: BucketCode;
  name: string;
  slug: string;
  purpose: string;
  primaryBuyer: string;
  description?: string;
  aspRangeMin?: number;
  aspRangeMax?: number;
  icon?: string; // lucide-react icon name
}
```

### `BUCKETS` (static data array)

`src/data/buckets.ts` — `readonly Bucket[]`. Gains three entries (I/J/K) at
positions 9/10/11; A–H are untouched. Consumed by
`src/app/(marketing)/collections/[slug]/page.tsx` and other catalog UI for
static generation and client-side filtering.

### `TIME_SAVERS` (new inline data + section)

`src/app/(marketing)/page.tsx` — a module-level `readonly` array of
`{ icon: LucideIcon; title: string; desc: string }` feeding the new
`<section>`. Rendered with the existing `Reveal` component and brand card
styling. Bottom CTA is a `next/link` to a `wa.me` URL built from the
`WHATSAPP_NUMBER` constant.

### Migration files (DB interface)

- `003_add_collections_ijk.sql` — enum extension batch.
- `004_seed_collections_ijk.sql` — bucket rows, `products.image_url` column,
  29 product rows.

No engine (`src/lib/engines/`), service, or API-route changes are required;
existing consumers read the widened types and the new static entries
transparently.

## Data Models

No new tables or columns beyond the single additive `image_url`. Affected
existing structures:

- **`bucket_code` enum** — gains `'I'`, `'J'`, `'K'` (existing A–H preserved).
- **`buckets` table** — gains 3 rows (sort_order 9/10/11). No schema change.
- **`products` table** — gains 29 rows + 1 nullable column (`image_url TEXT`).
- **`BucketCode` / `BucketCodeEnum` TS types** — widened to include I/J/K.
- **`Bucket` interface** — unchanged shape; 3 new `BUCKETS` array entries.

---

## Error Handling

| Concern | Handling |
|---|---|
| Enum value used before commit | Two-file split (003 enum → 004 seed) guarantees commit ordering. |
| Re-running migrations | `ADD VALUE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT (code) DO NOTHING` make 003/004 idempotent. |
| `wow_score` CHECK violation | Every SKU specifies a `wow_score` in [1,10]. |
| Invalid enum literals in arrays | All `personalization_types`/`occasions`/`archetypes` values are verified members of their enums. |
| `bucket_id` resolution fails | Bucket rows are inserted before product rows in 004; subselect `(SELECT id FROM buckets WHERE code=...)` resolves within the same file/transaction. |
| Slug uniqueness | `buckets.slug` and `products.slug` are `UNIQUE`; new slugs are distinct from existing ones. |
| TS build break from new codes | `BucketCode`/`BucketCodeEnum` widened in the same change set as `buckets.ts`. |

---

## Testing Strategy

Most of this feature is one-time data seeding, schema DDL, fixed UI content, and
copy edits — which are validated by example/snapshot/smoke checks rather than
property-based tests (PBT is inappropriate for IaC-style migrations, fixed
config, and static UI copy). A small set of genuine **data-integrity
invariants** over the static catalog layer and the seeded SKU set are expressed
as properties below.

- **Unit / example tests**: section placement and copy on the homepage; CTA
  href; presence of new collection cards; exact copy-swap assertions at the
  enumerated locations.
- **Smoke / migration tests**: migrations apply cleanly on a fresh DB; enum
  contains I/J/K; `image_url` column exists, is `TEXT` and nullable; no
  `DROP`/`CREATE TABLE`/RLS statements in 003/004.
- **Property tests**: the invariants in the next section, min 100 iterations
  each, generating over the static `BUCKETS` array / new product seed set.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all
valid executions of a system — a formal statement about what the system should
do. Properties bridge human-readable specifications and machine-verifiable
correctness guarantees.*

### Property 1: Static collections mirror the database seed

For all collection codes seeded by the migration (`I`, `J`, `K`), there exists
exactly one entry in `BUCKETS` whose `code`, `name`, and `slug` equal the values
inserted into the `buckets` table, and whose array position implies the same
`sort_order`.

**Validates: Requirements 2.1**

### Property 2: Every static bucket entry is well-formed

For all entries in `BUCKETS`, the `code` is a valid `BucketCode`, the `slug` is
unique across the array, and the required string fields (`name`, `slug`,
`purpose`, `primaryBuyer`) are non-empty.

**Validates: Requirements 2.2**

### Property 3: New SKUs are uniquely and correctly identified

For all new product rows, the `sku` matches the pattern `NV-[IJK][0-9]{2}` and
is globally unique; and the count of new SKUs per collection is exactly 13 for
`I`, 8 for `J`, and 8 for `K`.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: New product content is valid and complete

For all new product rows, `wow_score` is an integer in `[1, 10]`, `tagline` and
`description` are non-empty, and every value in `personalization_types`,
`occasions`, and `archetypes` is a member of its corresponding database enum.

**Validates: Requirements 3.5, 3.6**

### Property 5: New products carry no image yet

For all new product rows, `image_url` is `NULL`.

**Validates: Requirements 6.3**

### Property 6: The public static layer exposes no prices

For all entries in the public static catalog data (`BUCKETS` and the public
`PRODUCTS` data), no price-bearing field (e.g. `basePrice`, `cogs`,
`price_single`, `aspRange*`-as-price) carries a rendered monetary value on the
public surface.

**Validates: Requirements 7.3**
