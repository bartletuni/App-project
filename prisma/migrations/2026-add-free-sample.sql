-- Adds the flag that marks a PartRequest as a customer's free PLA 2.0 sample.
--
-- Generated with:
--   npx prisma migrate diff --from-schema <previous schema> \
--                           --to-schema prisma/schema.prisma --script
--
-- WHAT IT DOES
--   * PartRequest.isFreeSample — true on the one free sample a first-time
--     customer may request. Defaults to false, so every existing row reads
--     as "not a sample" with no backfill needed.
--
-- Purely additive: no table is rebuilt, nothing is dropped, and the new
-- column is defaulted. Safe to run against live data, and safe to run
-- BEFORE deploying the new code — the currently deployed code never reads
-- this column, but the new code cannot read a database that is missing it.
--
-- HOW TO APPLY
--
-- Option A — the Turso web SQL console (https://app.turso.tech → your
-- database → SQL): paste the single statement below and press Run.
--
-- Option B — the whole file at once:
--   TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
--   TURSO_AUTH_TOKEN="YOUR_TOKEN" \
--   node scripts/migrate-turso.mjs prisma/migrations/2026-add-free-sample.sql
--
-- Re-running it fails with "duplicate column name: isFreeSample" and changes
-- nothing — that is the signal the migration is already applied, not damage.
--
-- Take a backup first: turso db shell YOUR_DB .dump > backup.sql


ALTER TABLE "PartRequest" ADD COLUMN "isFreeSample" BOOLEAN NOT NULL DEFAULT false;


-- VERIFY --------------------------------------------------------------------
-- Optional. Run afterwards to confirm the column landed and check for any
-- samples already claimed.
--
--   SELECT COUNT(*) FROM PartRequest WHERE isFreeSample <> 0;
