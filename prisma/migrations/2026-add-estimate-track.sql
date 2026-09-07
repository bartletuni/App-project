-- Splits the quote track in two: ESTIMATE (an indication) and QUOTE (a price
-- the shop stands behind), and moves every existing row onto the right one.
--
-- WHY
--   A quote is a number we are on the hook for. We can only be on the hook for
--   one when we know exactly what we would print and who we would print it for
--   — which means an account holder who uploaded the part file. Everything
--   else (a no-account submission through the public form, or a part we still
--   have to model from a description) is priced from incomplete information
--   and goes out as an estimate. Existing rows were all filed as "QUOTE"
--   because that was the only pricing track there was, so the ones that never
--   qualified have to be relabelled — otherwise the console keeps calling
--   them quotes and the shop keeps sounding like it has committed to a price.
--
-- WHAT IT DOES
--   * No schema change at all. `PartRequest.kind` is already a free-text
--     column; "ESTIMATE" is simply a third value it may hold. Nothing is
--     added, nothing is dropped, and no table is rebuilt.
--   * Moves every QUOTE row that could never have carried a guaranteed price
--     — no account (guestEmail set) or no part file (fileId null) — onto the
--     ESTIMATE track, translating its status to the matching estimate status
--     so its place in the lifecycle is preserved.
--   * Leaves genuine quotes (account holder, part file present) exactly where
--     they are, and does not touch a single REQUEST row.
--
-- Being data-only and idempotent, it is safe to run against live data, and it
-- should be run BEFORE the new code is deployed. It is not strictly required
-- first: the application re-reads the same rule at display time and shows an
-- unqualified "QUOTE" row as an estimate regardless, so an un-migrated
-- database is safe, merely inconsistent between what is stored and shown.
--
-- HOW TO APPLY
--
-- Option A — the Turso web SQL console (https://app.turso.tech → your database
-- → SQL). The console runs one statement at a time, so paste the two
-- statements below one by one, in order, and press Run after each.
--
-- Option B — the whole file at once:
--   TURSO_DATABASE_URL="libsql://YOUR_DB.turso.io" \
--   TURSO_AUTH_TOKEN="YOUR_TOKEN" \
--   node scripts/migrate-turso.mjs prisma/migrations/2026-add-estimate-track.sql
--
-- Re-running either statement is harmless: the second pass matches no rows,
-- because everything it would have moved is already on the ESTIMATE track.
--
-- Take a backup first:  turso db shell YOUR_DB .dump > backup.sql


-- 1 of 2 --------------------------------------------------------------------
-- Translate the status first, while `kind` still identifies which rows are in
-- scope. Doing it the other way round would leave nothing to select on.
--
-- CANCELLED is shared by all three tracks and is deliberately left alone.
UPDATE "PartRequest"
   SET "status" = CASE "status"
                    WHEN 'QUOTE REQUESTED' THEN 'ESTIMATE REQUESTED'
                    WHEN 'QUOTE IN REVIEW' THEN 'ESTIMATE IN REVIEW'
                    WHEN 'QUOTE SENT'      THEN 'ESTIMATE SENT'
                    WHEN 'QUOTE ACCEPTED'  THEN 'ESTIMATE ACCEPTED'
                    WHEN 'QUOTE DECLINED'  THEN 'ESTIMATE DECLINED'
                    WHEN 'QUOTE EXPIRED'   THEN 'ESTIMATE EXPIRED'
                    ELSE "status"
                  END
 WHERE "kind" = 'QUOTE'
   AND ("guestEmail" IS NOT NULL OR "fileId" IS NULL);


-- 2 of 2 --------------------------------------------------------------------
-- Then the track itself.
UPDATE "PartRequest"
   SET "kind" = 'ESTIMATE'
 WHERE "kind" = 'QUOTE'
   AND ("guestEmail" IS NOT NULL OR "fileId" IS NULL);


-- VERIFY --------------------------------------------------------------------
-- Optional. Run these afterwards to see what the migration did.
--
--   SELECT kind, status, COUNT(*) FROM PartRequest GROUP BY kind, status;
--
--   -- Should return 0. Anything here is a row still calling itself a quote
--   -- that cannot support one.
--   SELECT COUNT(*) FROM PartRequest
--    WHERE kind = 'QUOTE' AND (guestEmail IS NOT NULL OR fileId IS NULL);
