-- Adds email confirmation to the no-account estimate form.
--
-- Generated with:
--   npx prisma migrate diff --from-schema <previous schema> \
--                           --to-schema prisma/schema.prisma --script
--
-- WHAT IT DOES
--   * EmailSuppression — addresses the estimate form must never email again,
--     because their owner clicked "This wasn't me" in its confirmation email.
--     Keys are an HMAC of the address, never the address itself.
--   * PartRequest.guestEmailConfirmedAt — when the person at a guest estimate's
--     email address clicked "Confirm it's me". Null until they do, and null on
--     every signed-in request, so every existing row reads as "unconfirmed"
--     (guest) or "not applicable" (signed in) with no backfill.
--
-- Purely additive: no table is rebuilt, nothing is dropped, and the new column
-- is nullable. Safe to run against live data, and safe to run BEFORE deploying
-- the new code — the currently deployed code never reads any of this, but the
-- new code cannot read a database that is missing it.
--
-- The new table is created first, so a second run fails on "already exists"
-- before PartRequest is touched.
--
-- HOW TO APPLY
--
-- Option A — the Turso web SQL console (https://app.turso.tech -> your
-- database -> SQL): paste the two statements below and press Run.
--
-- Option B — the whole file at once:
--   TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
--   TURSO_AUTH_TOKEN="YOUR_TOKEN" \
--   node scripts/migrate-turso.mjs prisma/migrations/2026-add-guest-email-confirmation.sql
--
-- Re-running it fails with "table EmailSuppression already exists" and changes
-- nothing — that is the signal the migration is already applied, not damage.
--
-- Take a backup first: turso db shell YOUR_DB .dump > backup.sql


CREATE TABLE "EmailSuppression" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "PartRequest" ADD COLUMN "guestEmailConfirmedAt" DATETIME;


-- VERIFY --------------------------------------------------------------------
-- Optional. Run afterwards to confirm the table and column landed.
--
--   SELECT COUNT(*) FROM EmailSuppression;
--   SELECT COUNT(*) FROM PartRequest WHERE guestEmail IS NOT NULL AND guestEmailConfirmedAt IS NULL;
