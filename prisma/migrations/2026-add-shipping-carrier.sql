-- Records which carrier, and which of its services, a part shipped with.
--
-- Generated with:
--   npx prisma migrate diff --from-schema <previous schema> \
--                           --to-schema prisma/schema.prisma --script
-- which proposes rebuilding PartRequest only to put the new columns in
-- schema order. Prisma does not depend on column order, so the two columns
-- are added in place instead, as the other additive migrations here are.
--
-- WHAT IT DOES
--   * PartRequest.shippingCarrier — 'USPS', 'UPS', 'FEDEX' or 'DHL' (see
--     CARRIERS in src/lib/shipping.ts). Defaults to 'USPS', the shop's
--     primary carrier, so every existing row — all of which shipped by USPS —
--     reads correctly with no backfill.
--   * PartRequest.shippingService — the service level ("Priority Mail",
--     "Ground"), free text, nullable.
--
-- Purely additive: no table is rebuilt, nothing is dropped, and every new
-- column is nullable or defaulted. Safe to run against live data.
--
-- It MUST be run BEFORE deploying the code that reads these columns. Every
-- request listing (the admin console and the customer dashboard) selects all
-- of PartRequest's columns, so new code against a database without them
-- fails on every page that lists requests. The currently deployed code never
-- reads them, so applying this first is harmless.
--
-- HOW TO APPLY
--
-- Option A — the Turso web SQL console (https://app.turso.tech → your
-- database → SQL). The console runs one statement at a time, so paste the two
-- statements below one by one, in order, and press Run after each.
--
-- Option B — the whole file at once:
--   TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
--   TURSO_AUTH_TOKEN="YOUR_TOKEN" \
--   node scripts/migrate-turso.mjs prisma/migrations/2026-add-shipping-carrier.sql
--
-- Re-running statement 1 fails with "duplicate column name: shippingCarrier"
-- and changes nothing — that is the signal the migration is already applied,
-- not damage.
--
-- Take a backup first: turso db shell YOUR_DB .dump > backup.sql


-- 1
ALTER TABLE "PartRequest" ADD COLUMN "shippingCarrier" TEXT NOT NULL DEFAULT 'USPS';

-- 2
ALTER TABLE "PartRequest" ADD COLUMN "shippingService" TEXT;


-- VERIFY --------------------------------------------------------------------
-- Optional. Run afterwards to confirm both columns landed; every existing row
-- should read USPS.
--
--   SELECT shippingCarrier, COUNT(*) FROM PartRequest GROUP BY shippingCarrier;
