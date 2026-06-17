-- =============================================================================
-- Neon Visuals — Pricing Data + Quote Schema Extensions (006)
-- Part A: populate internal pricing for all 120 products (INR). INTERNAL ONLY —
--         never exposed publicly; products.ts stays price-free.
-- Part B: extend quote_status enum + quotes table for the quote engine.
-- Additive only (UPDATE / ALTER). RLS untouched (service role bypasses RLS).
-- =============================================================================

-- ---------- Part A: Bucket A — Welcome & Onboarding -------------------------
UPDATE products SET cogs = 380, price_single = 999, price_bulk_25 = 899, price_bulk_100 = 799, margin_percent = 58 WHERE sku = 'NV-A01';
UPDATE products SET cogs = 280, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 60 WHERE sku = 'NV-A02';
UPDATE products SET cogs = 180, price_single = 599, price_bulk_25 = 499, price_bulk_100 = 449, margin_percent = 64 WHERE sku = 'NV-A03';
UPDATE products SET cogs = 220, price_single = 699, price_bulk_25 = 599, price_bulk_100 = 549, margin_percent = 65 WHERE sku = 'NV-A04';
UPDATE products SET cogs = 200, price_single = 649, price_bulk_25 = 549, price_bulk_100 = 499, margin_percent = 66 WHERE sku = 'NV-A05';
UPDATE products SET cogs = 170, price_single = 549, price_bulk_25 = 449, price_bulk_100 = 399, margin_percent = 66 WHERE sku = 'NV-A06';
UPDATE products SET cogs = 120, price_single = 399, price_bulk_25 = 349, price_bulk_100 = 299, margin_percent = 65 WHERE sku = 'NV-A07';
UPDATE products SET cogs = 240, price_single = 699, price_bulk_25 = 599, price_bulk_100 = 549, margin_percent = 62 WHERE sku = 'NV-A08';
UPDATE products SET cogs = 480, price_single = 1399, price_bulk_25 = 1199, price_bulk_100 = 1099, margin_percent = 61 WHERE sku = 'NV-A09';
UPDATE products SET cogs = 320, price_single = 999, price_bulk_25 = 849, price_bulk_100 = 799, margin_percent = 64 WHERE sku = 'NV-A10';
UPDATE products SET cogs = 250, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 66 WHERE sku = 'NV-A11';
UPDATE products SET cogs = 80, price_single = 299, price_bulk_25 = 249, price_bulk_100 = 199, margin_percent = 70 WHERE sku = 'NV-A12';
UPDATE products SET cogs = 180, price_single = 549, price_bulk_25 = 449, price_bulk_100 = 399, margin_percent = 64 WHERE sku = 'NV-A13';
UPDATE products SET cogs = 130, price_single = 449, price_bulk_25 = 379, price_bulk_100 = 349, margin_percent = 68 WHERE sku = 'NV-A14';
UPDATE products SET cogs = 60, price_single = 199, price_bulk_25 = 169, price_bulk_100 = 149, margin_percent = 67 WHERE sku = 'NV-A15';
UPDATE products SET cogs = 300, price_single = 899, price_bulk_25 = 799, price_bulk_100 = 749, margin_percent = 63 WHERE sku = 'NV-A16';
UPDATE products SET cogs = 160, price_single = 499, price_bulk_25 = 429, price_bulk_100 = 399, margin_percent = 65 WHERE sku = 'NV-A17';

-- ---------- Bucket B — Milestone & Work Anniversary -------------------------
UPDATE products SET cogs = 350, price_single = 1099, price_bulk_25 = 949, price_bulk_100 = 899, margin_percent = 64 WHERE sku = 'NV-B01';
UPDATE products SET cogs = 280, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 62 WHERE sku = 'NV-B02';
UPDATE products SET cogs = 450, price_single = 1399, price_bulk_25 = 1199, price_bulk_100 = 1099, margin_percent = 65 WHERE sku = 'NV-B03';
UPDATE products SET cogs = 350, price_single = 1099, price_bulk_25 = 949, price_bulk_100 = 899, margin_percent = 65 WHERE sku = 'NV-B04';
UPDATE products SET cogs = 600, price_single = 1999, price_bulk_25 = 1699, price_bulk_100 = 1599, margin_percent = 66 WHERE sku = 'NV-B05';
UPDATE products SET cogs = 400, price_single = 1299, price_bulk_25 = 1099, price_bulk_100 = 999, margin_percent = 66 WHERE sku = 'NV-B06';
UPDATE products SET cogs = 550, price_single = 1799, price_bulk_25 = 1499, price_bulk_100 = 1399, margin_percent = 66 WHERE sku = 'NV-B07';
UPDATE products SET cogs = 700, price_single = 2199, price_bulk_25 = 1899, price_bulk_100 = 1799, margin_percent = 64 WHERE sku = 'NV-B08';
UPDATE products SET cogs = 900, price_single = 2999, price_bulk_25 = 2599, price_bulk_100 = 2399, margin_percent = 66 WHERE sku = 'NV-B09';
UPDATE products SET cogs = 500, price_single = 1999, price_bulk_25 = 1699, price_bulk_100 = 1599, margin_percent = 72 WHERE sku = 'NV-B10';
UPDATE products SET cogs = 800, price_single = 2799, price_bulk_25 = 2399, price_bulk_100 = 2199, margin_percent = 68 WHERE sku = 'NV-B11';
UPDATE products SET cogs = 350, price_single = 1299, price_bulk_25 = 1099, price_bulk_100 = 999, margin_percent = 70 WHERE sku = 'NV-B12';
UPDATE products SET cogs = 500, price_single = 1499, price_bulk_25 = 1299, price_bulk_100 = 1199, margin_percent = 63 WHERE sku = 'NV-B13';
UPDATE products SET cogs = 450, price_single = 1399, price_bulk_25 = 1199, price_bulk_100 = 1099, margin_percent = 65 WHERE sku = 'NV-B14';
UPDATE products SET cogs = 400, price_single = 1299, price_bulk_25 = 1099, price_bulk_100 = 999, margin_percent = 67 WHERE sku = 'NV-B15';

-- ---------- Bucket C — CEO & Leadership -------------------------------------
UPDATE products SET cogs = 300, price_single = 1199, price_bulk_25 = 999, price_bulk_100 = 899, margin_percent = 72 WHERE sku = 'NV-C01';
UPDATE products SET cogs = 500, price_single = 1699, price_bulk_25 = 1499, price_bulk_100 = 1399, margin_percent = 68 WHERE sku = 'NV-C02';
UPDATE products SET cogs = 600, price_single = 2499, price_bulk_25 = 2199, price_bulk_100 = 1999, margin_percent = 72 WHERE sku = 'NV-C03';
UPDATE products SET cogs = 800, price_single = 2799, price_bulk_25 = 2399, price_bulk_100 = 2199, margin_percent = 68 WHERE sku = 'NV-C04';
UPDATE products SET cogs = 750, price_single = 2499, price_bulk_25 = 2199, price_bulk_100 = 1999, margin_percent = 67 WHERE sku = 'NV-C05';
UPDATE products SET cogs = 300, price_single = 1099, price_bulk_25 = 949, price_bulk_100 = 899, margin_percent = 70 WHERE sku = 'NV-C06';
UPDATE products SET cogs = 500, price_single = 1499, price_bulk_25 = 1299, price_bulk_100 = 1199, margin_percent = 63 WHERE sku = 'NV-C07';
UPDATE products SET cogs = 600, price_single = 1999, price_bulk_25 = 1699, price_bulk_100 = 1599, margin_percent = 67 WHERE sku = 'NV-C08';
UPDATE products SET cogs = 350, price_single = 1199, price_bulk_25 = 999, price_bulk_100 = 899, margin_percent = 68 WHERE sku = 'NV-C09';
UPDATE products SET cogs = 1800, price_single = 5999, price_bulk_25 = 5499, price_bulk_100 = 4999, margin_percent = 66 WHERE sku = 'NV-C10';
UPDATE products SET cogs = 700, price_single = 2299, price_bulk_25 = 1999, price_bulk_100 = 1899, margin_percent = 66 WHERE sku = 'NV-C11';
UPDATE products SET cogs = 650, price_single = 2199, price_bulk_25 = 1899, price_bulk_100 = 1799, margin_percent = 67 WHERE sku = 'NV-C12';

-- ---------- Bucket D — Festive & Seasonal -----------------------------------
UPDATE products SET cogs = 350, price_single = 1099, price_bulk_25 = 949, price_bulk_100 = 899, margin_percent = 65 WHERE sku = 'NV-D01';
UPDATE products SET cogs = 280, price_single = 899, price_bulk_25 = 799, price_bulk_100 = 749, margin_percent = 67 WHERE sku = 'NV-D02';
UPDATE products SET cogs = 550, price_single = 1699, price_bulk_25 = 1499, price_bulk_100 = 1399, margin_percent = 65 WHERE sku = 'NV-D03';
UPDATE products SET cogs = 300, price_single = 899, price_bulk_25 = 799, price_bulk_100 = 749, margin_percent = 64 WHERE sku = 'NV-D04';
UPDATE products SET cogs = 250, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 66 WHERE sku = 'NV-D05';
UPDATE products SET cogs = 150, price_single = 499, price_bulk_25 = 429, price_bulk_100 = 399, margin_percent = 67 WHERE sku = 'NV-D06';
UPDATE products SET cogs = 200, price_single = 649, price_bulk_25 = 549, price_bulk_100 = 499, margin_percent = 66 WHERE sku = 'NV-D07';
UPDATE products SET cogs = 500, price_single = 1499, price_bulk_25 = 1299, price_bulk_100 = 1199, margin_percent = 63 WHERE sku = 'NV-D08';
UPDATE products SET cogs = 400, price_single = 1199, price_bulk_25 = 1049, price_bulk_100 = 999, margin_percent = 63 WHERE sku = 'NV-D09';
UPDATE products SET cogs = 450, price_single = 1399, price_bulk_25 = 1199, price_bulk_100 = 1099, margin_percent = 65 WHERE sku = 'NV-D10';
UPDATE products SET cogs = 500, price_single = 1499, price_bulk_25 = 1299, price_bulk_100 = 1199, margin_percent = 63 WHERE sku = 'NV-D11';
UPDATE products SET cogs = 200, price_single = 649, price_bulk_25 = 549, price_bulk_100 = 499, margin_percent = 66 WHERE sku = 'NV-D12';
UPDATE products SET cogs = 500, price_single = 1499, price_bulk_25 = 1299, price_bulk_100 = 1199, margin_percent = 63 WHERE sku = 'NV-D13';
UPDATE products SET cogs = 300, price_single = 999, price_bulk_25 = 849, price_bulk_100 = 799, margin_percent = 67 WHERE sku = 'NV-D14';
UPDATE products SET cogs = 250, price_single = 749, price_bulk_25 = 649, price_bulk_100 = 599, margin_percent = 64 WHERE sku = 'NV-D15';

-- ---------- Bucket E — Client Appreciation ----------------------------------
UPDATE products SET cogs = 700, price_single = 2499, price_bulk_25 = 2199, price_bulk_100 = 1999, margin_percent = 68 WHERE sku = 'NV-E01';
UPDATE products SET cogs = 450, price_single = 1799, price_bulk_25 = 1499, price_bulk_100 = 1399, margin_percent = 72 WHERE sku = 'NV-E02';
UPDATE products SET cogs = 500, price_single = 1799, price_bulk_25 = 1499, price_bulk_100 = 1399, margin_percent = 70 WHERE sku = 'NV-E03';
UPDATE products SET cogs = 800, price_single = 2799, price_bulk_25 = 2399, price_bulk_100 = 2199, margin_percent = 68 WHERE sku = 'NV-E04';
UPDATE products SET cogs = 1200, price_single = 3999, price_bulk_25 = 3499, price_bulk_100 = 3199, margin_percent = 67 WHERE sku = 'NV-E05';
UPDATE products SET cogs = 700, price_single = 2499, price_bulk_25 = 2199, price_bulk_100 = 1999, margin_percent = 68 WHERE sku = 'NV-E06';
UPDATE products SET cogs = 400, price_single = 1399, price_bulk_25 = 1199, price_bulk_100 = 1099, margin_percent = 68 WHERE sku = 'NV-E07';
UPDATE products SET cogs = 350, price_single = 1499, price_bulk_25 = 1299, price_bulk_100 = 1199, margin_percent = 74 WHERE sku = 'NV-E08';
UPDATE products SET cogs = 2500, price_single = 7999, price_bulk_25 = 6999, price_bulk_100 = 6499, margin_percent = 66 WHERE sku = 'NV-E09';
UPDATE products SET cogs = 350, price_single = 1199, price_bulk_25 = 999, price_bulk_100 = 899, margin_percent = 68 WHERE sku = 'NV-E10';
UPDATE products SET cogs = 400, price_single = 1299, price_bulk_25 = 1099, price_bulk_100 = 999, margin_percent = 66 WHERE sku = 'NV-E11';
UPDATE products SET cogs = 900, price_single = 2999, price_bulk_25 = 2699, price_bulk_100 = 2499, margin_percent = 67 WHERE sku = 'NV-E12';

-- ---------- Bucket F — Experience Kits --------------------------------------
UPDATE products SET cogs = 1500, price_single = 4999, price_bulk_25 = 4499, price_bulk_100 = 3999, margin_percent = 67 WHERE sku = 'NV-F01';
UPDATE products SET cogs = 2000, price_single = 6999, price_bulk_25 = 6199, price_bulk_100 = 5799, margin_percent = 68 WHERE sku = 'NV-F02';
UPDATE products SET cogs = 3000, price_single = 9999, price_bulk_25 = 8999, price_bulk_100 = 8499, margin_percent = 68 WHERE sku = 'NV-F03';
UPDATE products SET cogs = 2500, price_single = 7999, price_bulk_25 = 6999, price_bulk_100 = 6499, margin_percent = 66 WHERE sku = 'NV-F04';

-- ---------- Bucket G — Tech-Forward -----------------------------------------
UPDATE products SET cogs = 350, price_single = 1199, price_bulk_25 = 999, price_bulk_100 = 899, margin_percent = 68 WHERE sku = 'NV-G01';
UPDATE products SET cogs = 250, price_single = 899, price_bulk_25 = 749, price_bulk_100 = 699, margin_percent = 70 WHERE sku = 'NV-G02';
UPDATE products SET cogs = 300, price_single = 1099, price_bulk_25 = 949, price_bulk_100 = 899, margin_percent = 70 WHERE sku = 'NV-G03';
UPDATE products SET cogs = 120, price_single = 449, price_bulk_25 = 399, price_bulk_100 = 349, margin_percent = 72 WHERE sku = 'NV-G04';

-- ---------- Bucket H — Sustainability ---------------------------------------
UPDATE products SET cogs = 200, price_single = 699, price_bulk_25 = 599, price_bulk_100 = 549, margin_percent = 70 WHERE sku = 'NV-H01';
UPDATE products SET cogs = 180, price_single = 599, price_bulk_25 = 499, price_bulk_100 = 449, margin_percent = 68 WHERE sku = 'NV-H02';
UPDATE products SET cogs = 300, price_single = 999, price_bulk_25 = 849, price_bulk_100 = 799, margin_percent = 67 WHERE sku = 'NV-H03';
UPDATE products SET cogs = 280, price_single = 899, price_bulk_25 = 799, price_bulk_100 = 749, margin_percent = 67 WHERE sku = 'NV-H04';
UPDATE products SET cogs = 200, price_single = 649, price_bulk_25 = 549, price_bulk_100 = 499, margin_percent = 66 WHERE sku = 'NV-H05';
UPDATE products SET cogs = 150, price_single = 499, price_bulk_25 = 429, price_bulk_100 = 399, margin_percent = 67 WHERE sku = 'NV-H06';
UPDATE products SET cogs = 180, price_single = 599, price_bulk_25 = 499, price_bulk_100 = 449, margin_percent = 67 WHERE sku = 'NV-H07';
UPDATE products SET cogs = 250, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 66 WHERE sku = 'NV-H08';
UPDATE products SET cogs = 400, price_single = 1199, price_bulk_25 = 1049, price_bulk_100 = 999, margin_percent = 63 WHERE sku = 'NV-H09';
UPDATE products SET cogs = 250, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 66 WHERE sku = 'NV-H10';
UPDATE products SET cogs = 180, price_single = 599, price_bulk_25 = 499, price_bulk_100 = 449, margin_percent = 67 WHERE sku = 'NV-H11';
UPDATE products SET cogs = 200, price_single = 649, price_bulk_25 = 549, price_bulk_100 = 499, margin_percent = 66 WHERE sku = 'NV-H12';

-- ---------- Bucket I — Events & General -------------------------------------
UPDATE products SET cogs = 400, price_single = 1299, price_bulk_25 = 1099, price_bulk_100 = 999, margin_percent = 66 WHERE sku = 'NV-I01';
UPDATE products SET cogs = 80, price_single = 299, price_bulk_25 = 249, price_bulk_100 = 199, margin_percent = 70 WHERE sku = 'NV-I02';
UPDATE products SET cogs = 350, price_single = 1099, price_bulk_25 = 949, price_bulk_100 = 899, margin_percent = 65 WHERE sku = 'NV-I03';
UPDATE products SET cogs = 800, price_single = 2499, price_bulk_25 = 2199, price_bulk_100 = 1999, margin_percent = 65 WHERE sku = 'NV-I04';
UPDATE products SET cogs = 150, price_single = 499, price_bulk_25 = 429, price_bulk_100 = 399, margin_percent = 67 WHERE sku = 'NV-I05';
UPDATE products SET cogs = 200, price_single = 649, price_bulk_25 = 549, price_bulk_100 = 499, margin_percent = 66 WHERE sku = 'NV-I06';
UPDATE products SET cogs = 100, price_single = 349, price_bulk_25 = 299, price_bulk_100 = 269, margin_percent = 68 WHERE sku = 'NV-I07';
UPDATE products SET cogs = 350, price_single = 1199, price_bulk_25 = 999, price_bulk_100 = 899, margin_percent = 68 WHERE sku = 'NV-I08';
UPDATE products SET cogs = 400, price_single = 1299, price_bulk_25 = 1099, price_bulk_100 = 999, margin_percent = 67 WHERE sku = 'NV-I09';
UPDATE products SET cogs = 250, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 66 WHERE sku = 'NV-I10';
UPDATE products SET cogs = 220, price_single = 699, price_bulk_25 = 599, price_bulk_100 = 549, margin_percent = 65 WHERE sku = 'NV-I11';
UPDATE products SET cogs = 400, price_single = 1199, price_bulk_25 = 1049, price_bulk_100 = 999, margin_percent = 63 WHERE sku = 'NV-I12';
UPDATE products SET cogs = 200, price_single = 599, price_bulk_25 = 499, price_bulk_100 = 449, margin_percent = 64 WHERE sku = 'NV-I13';

-- ---------- Bucket J — College Events ---------------------------------------
UPDATE products SET cogs = 180, price_single = 549, price_bulk_25 = 449, price_bulk_100 = 399, margin_percent = 64 WHERE sku = 'NV-J01';
UPDATE products SET cogs = 380, price_single = 1199, price_bulk_25 = 999, price_bulk_100 = 899, margin_percent = 63 WHERE sku = 'NV-J02';
UPDATE products SET cogs = 150, price_single = 449, price_bulk_25 = 379, price_bulk_100 = 349, margin_percent = 64 WHERE sku = 'NV-J03';
UPDATE products SET cogs = 170, price_single = 499, price_bulk_25 = 429, price_bulk_100 = 399, margin_percent = 64 WHERE sku = 'NV-J04';
UPDATE products SET cogs = 80, price_single = 249, price_bulk_25 = 199, price_bulk_100 = 179, margin_percent = 66 WHERE sku = 'NV-J05';
UPDATE products SET cogs = 250, price_single = 799, price_bulk_25 = 699, price_bulk_100 = 649, margin_percent = 66 WHERE sku = 'NV-J06';
UPDATE products SET cogs = 200, price_single = 599, price_bulk_25 = 499, price_bulk_100 = 449, margin_percent = 64 WHERE sku = 'NV-J07';
UPDATE products SET cogs = 120, price_single = 399, price_bulk_25 = 349, price_bulk_100 = 299, margin_percent = 67 WHERE sku = 'NV-J08';

-- ---------- Bucket K — Visiting Cards (per-card pricing) ---------------------
UPDATE products SET cogs = 3, price_single = 10, price_bulk_25 = 8, price_bulk_100 = 6, margin_percent = 65 WHERE sku = 'NV-K01';
UPDATE products SET cogs = 80, price_single = 249, price_bulk_25 = 199, price_bulk_100 = 179, margin_percent = 65 WHERE sku = 'NV-K02';
UPDATE products SET cogs = 15, price_single = 45, price_bulk_25 = 35, price_bulk_100 = 30, margin_percent = 60 WHERE sku = 'NV-K03';
UPDATE products SET cogs = 120, price_single = 399, price_bulk_25 = 349, price_bulk_100 = 299, margin_percent = 68 WHERE sku = 'NV-K04';
UPDATE products SET cogs = 8, price_single = 25, price_bulk_25 = 20, price_bulk_100 = 15, margin_percent = 62 WHERE sku = 'NV-K05';
UPDATE products SET cogs = 30, price_single = 99, price_bulk_25 = 79, price_bulk_100 = 69, margin_percent = 65 WHERE sku = 'NV-K06';
UPDATE products SET cogs = 25, price_single = 79, price_bulk_25 = 65, price_bulk_100 = 55, margin_percent = 64 WHERE sku = 'NV-K07';
UPDATE products SET cogs = 600, price_single = 1999, price_bulk_25 = 1799, price_bulk_100 = 1599, margin_percent = 67 WHERE sku = 'NV-K08';

-- =============================================================================
-- Part B: Quote schema extensions for the quote engine (additive)
-- =============================================================================
ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS occasion TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS kit_count INTEGER DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS packaging_tier TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS personalisation_level TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS resume_intelligence BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rush_order BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rush_days INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS products JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS pricing JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS final_total NUMERIC;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS per_kit_investment NUMERIC;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 15;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sample_message TEXT;

-- =============================================================================
-- End of migration 006
-- =============================================================================
