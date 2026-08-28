/**
 * Applies a SQL migration to a Turso (libSQL) database.
 *
 *   node scripts/migrate-turso.mjs prisma/migrations/2026-add-description-requests.sql
 *
 * Credentials come from the environment, the same two variables the app itself
 * reads, so this works with whatever is already in your shell or .env:
 *
 *   TURSO_DATABASE_URL="libsql://<db>-<org>.<region>.turso.io"
 *   TURSO_AUTH_TOKEN="..."
 *
 * Why not `prisma db push`? The Prisma CLI validates the datasource URL against
 * the schema's provider, and `provider = "sqlite"` only accepts a `file:` URL —
 * a `libsql://` host is rejected with P1013 before anything runs. Prisma 7.8's
 * config has no driver-adapter hook for migrate/push, so the CLI cannot reach
 * Turso at all. The application is unaffected: it goes through PrismaLibSql at
 * runtime, which speaks libSQL natively. This script uses that same client.
 *
 * Statements run in order on one connection, so the PRAGMA lines that guard the
 * table rebuild apply to the statements that follow them — which is exactly why
 * the file must not be split up and fed in piecemeal.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/migrate-turso.mjs <path-to-.sql>");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set.");
  process.exit(1);
}
if (!url.startsWith("libsql://") && !url.startsWith("file:") && !url.startsWith("http")) {
  console.error(`TURSO_DATABASE_URL should start with libsql:// — got "${url.slice(0, 24)}…"`);
  process.exit(1);
}
if (url.startsWith("libsql://") && !authToken) {
  console.error("TURSO_AUTH_TOKEN is not set (required for a remote database).");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = createClient({ url, authToken });

// Print the host but never the token.
console.log(`Applying ${file}`);
console.log(`   to ${url.replace(/\?.*$/, "")}`);

try {
  const before = await tableNames(client);
  await client.executeMultiple(sql);
  const after = await tableNames(client);

  const added = after.filter((t) => !before.includes(t));
  console.log("\n✅ Migration applied.");
  if (added.length) console.log(`   New tables: ${added.join(", ")}`);

  // Report the shape of the result so a silent no-op is obvious.
  for (const table of ["PartRequest", "RequestAttachment"]) {
    if (!after.includes(table)) continue;
    const { rows } = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
    console.log(`   ${table}: ${rows[0].n} row(s)`);
  }
  if (after.includes("PartRequest")) {
    const { rows } = await client.execute(
      `SELECT submissionType, COUNT(*) AS n FROM "PartRequest" GROUP BY submissionType`
    );
    for (const row of rows) console.log(`   submissionType ${row.submissionType}: ${row.n}`);
  }
} catch (err) {
  const message = err?.message || String(err);
  if (/already exists/i.test(message)) {
    // The file creates its new table first, so this fails before PartRequest is
    // touched — the database is untouched, not half-migrated.
    console.error("\n❌ This migration looks like it has already been applied.");
    console.error(`   (${message})`);
    console.error("\nNothing was changed. Check the current schema before re-running.");
  } else {
    console.error("\n❌ Migration failed:", message);
    console.error("\nNothing was committed past the failing statement. Check the error above,");
    console.error("and restore from your backup if the run stopped mid-rebuild.");
  }
  process.exitCode = 1;
} finally {
  client.close();
}

async function tableNames(client) {
  const { rows } = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return rows.map((r) => String(r.name));
}
