-- Adds the "no STL or ZIP" submission path to an existing database.
--
-- Generated with:
--   npx prisma migrate diff --from-schema <previous schema> \
--                           --to-schema prisma/schema.prisma --script
--
-- Apply with `node scripts/migrate-turso.mjs <this file>` (see README →
-- "Applying this to Turso"), or feed it to `turso db shell` in one go.
-- `prisma db push` cannot reach Turso — the CLI rejects a libsql:// URL against
-- the sqlite provider with P1013.
--
-- What it does:
--   * creates RequestAttachment (reference photos/drawings, cascade-deleted
--     with their request)
--   * rebuilds PartRequest to add submissionType/partName/partDescription/
--     dimensions and to make fileId/fileName nullable
--
-- SQLite cannot relax a NOT NULL constraint in place, so PartRequest is rebuilt:
-- a new table is created, rows are copied, the old table is dropped, and the new
-- one is renamed. Existing rows are preserved and backfilled to
-- submissionType='MODEL'. Take a backup first (`turso db shell <db> .dump`) and
-- run the whole file in one go, on one connection — an interruption between the
-- DROP and the RENAME would leave the table missing.
--
-- Safe to run before deploying the new code: the current code never reads the
-- new columns, and every one of them is nullable or defaulted.


-- CreateTable
CREATE TABLE "RequestAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL DEFAULT 'MODEL',
    "fileId" TEXT,
    "fileName" TEXT,
    "partName" TEXT,
    "partDescription" TEXT,
    "dimensions" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "material" TEXT,
    "notes" TEXT,
    "printSettings" TEXT,
    "quoteRequested" BOOLEAN NOT NULL DEFAULT false,
    "dateNeeded" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT,
    "trackingNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartRequest_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PartRequest" ("createdAt", "dateNeeded", "fileId", "fileName", "id", "invoiceNumber", "material", "notes", "phoneNumberId", "printSettings", "quantity", "quoteRequested", "status", "trackingNumber", "updatedAt", "userId") SELECT "createdAt", "dateNeeded", "fileId", "fileName", "id", "invoiceNumber", "material", "notes", "phoneNumberId", "printSettings", "quantity", "quoteRequested", "status", "trackingNumber", "updatedAt", "userId" FROM "PartRequest";
DROP TABLE "PartRequest";
ALTER TABLE "new_PartRequest" RENAME TO "PartRequest";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RequestAttachment_fileId_key" ON "RequestAttachment"("fileId");

