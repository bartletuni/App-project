-- Adds the no-account quote lane: the public /quote form.
--
-- Generated with:
--   npx prisma migrate diff --from-schema <previous schema> \
--                           --to-schema prisma/schema.prisma --script
--
-- WHAT IT DOES
--   * User.isGuest — true while an account exists only because someone asked
--     for a quote without signing up. Its password is a random secret nobody
--     holds, so the row cannot be signed into; registering with the same
--     address claims it in place and clears the flag.
--   * PartRequest.guestSubmitted — true when a request arrived through /quote
--     rather than the signed-in composer. Permanent provenance: it stays true
--     after the customer opens an account.
--   * RateLimit — fixed-window counters for the public endpoints. An
--     in-process counter resets with every serverless cold start, so the
--     ceiling on the quote form lives in the database. Keys are opaque: an
--     address is stored as an HMAC, never in the clear.
--
-- Purely additive: no table is rebuilt, nothing is dropped, and both new
-- columns are defaulted, so every existing row reads as "not a guest" with no
-- backfill needed. Safe to run against live data, and safe to run BEFORE
-- deploying the new code — the currently deployed code never reads any of
-- this, but the new code cannot read a database that is missing it.
--
-- HOW TO APPLY
--
-- Option A — the Turso web SQL console (https://app.turso.tech -> your
-- database -> SQL): paste the statements below and press Run.
--
-- Option B — the whole file at once:
--   TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
--   TURSO_AUTH_TOKEN="YOUR_TOKEN" \
--   node scripts/migrate-turso.mjs prisma/migrations/2026-add-guest-quotes.sql
--
-- Re-running it fails with "duplicate column name: isGuest" and changes
-- nothing — that is the signal the migration is already applied, not damage.
--
-- Take a backup first: turso db shell YOUR_DB .dump > backup.sql


ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PartRequest" ADD COLUMN "guestSubmitted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL
);


-- VERIFY --------------------------------------------------------------------
-- Optional. Run afterwards to confirm the columns and table landed.
--
--   SELECT COUNT(*) FROM User WHERE isGuest <> 0;
--   SELECT COUNT(*) FROM PartRequest WHERE guestSubmitted <> 0;
--   SELECT COUNT(*) FROM RateLimit;
