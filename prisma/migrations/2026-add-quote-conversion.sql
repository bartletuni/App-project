-- Puts quotes on their own status track and lets an admin convert one into a
-- build request.
--
-- Generated with:
--   npx prisma migrate diff --from-schema <previous schema> \
--                           --to-schema prisma/schema.prisma --script
-- then split into single statements and given a backfill.
--
-- WHAT IT DOES
--   * PartRequest.kind        — 'QUOTE' or 'REQUEST'. Decides which set of
--                               statuses the row uses.
--   * PartRequest.quotedPrice — what the shop quoted (free text).
--   * PartRequest.convertedAt — when a quote became a build request.
--   * Backfills every open quote onto the quote track.
--
-- This is purely additive: no table is rebuilt, nothing is dropped, and every
-- new column is nullable or defaulted. It is therefore safe to run against
-- live data, and it must be run BEFORE the new code is deployed: the currently
-- deployed code never reads these columns, but the new code cannot read a
-- database that is missing them.
--
-- HOW TO APPLY
--
-- Option A — the Turso web SQL console (https://app.turso.tech → your database
-- → SQL). The console runs one statement at a time, so paste the four
-- statements below one by one, in order, and press Run after each. They are
-- numbered for that reason. Each is complete on its own line-block; do not
-- paste the comments.
--
-- Option B — the whole file at once:
--   TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
--   TURSO_AUTH_TOKEN="YOUR_TOKEN" \
--   node scripts/migrate-turso.mjs prisma/migrations/2026-add-quote-conversion.sql
--
-- Re-running statement 1 fails with "duplicate column name: kind" and changes
-- nothing — that is the signal the migration is already applied, not damage.
--
-- Take a backup first:  turso db shell YOUR_DB .dump > backup.sql


-- 1 of 4 --------------------------------------------------------------------
ALTER TABLE "PartRequest" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'REQUEST';

-- 2 of 4 --------------------------------------------------------------------
ALTER TABLE "PartRequest" ADD COLUMN "quotedPrice" TEXT;

-- 3 of 4 --------------------------------------------------------------------
ALTER TABLE "PartRequest" ADD COLUMN "convertedAt" DATETIME;

-- 4 of 4 --------------------------------------------------------------------
-- Existing quotes that are still sitting where they were filed move onto the
-- quote track. A quote that already went ACTIVE, INVOICE SENT, SHIPPED,
-- COMPLETED, NEEDS REVIEW or CANCELLED was in practice already being worked as
-- a build, so it stays a REQUEST and keeps the status it has — converting it
-- now would rewind it.
--
-- `<> 0` rather than `= 1` because a boolean written by a different client may
-- be stored as text; in SQLite any text compares unequal to the integer 0.
UPDATE "PartRequest"
   SET "kind" = 'QUOTE',
       "status" = 'QUOTE REQUESTED'
 WHERE "quoteRequested" <> 0
   AND "status" = 'PENDING';


-- VERIFY --------------------------------------------------------------------
-- Optional. Run these afterwards to see what the migration did.
--
--   SELECT kind, status, COUNT(*) FROM PartRequest GROUP BY kind, status;
--   SELECT COUNT(*) FROM PartRequest WHERE kind = 'QUOTE';
