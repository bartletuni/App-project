/**
 * Interactive wrapper around scripts/migrate-turso.mjs — prompts for the Turso
 * credentials instead of requiring them in the environment.
 *
 *   node migrate-turso.mjs [path-to-.sql]
 *
 * Defaults to the migration that adds the "no STL or ZIP" submission path.
 *
 * This used to shell out to `npx prisma db push`, which cannot work: the Prisma
 * CLI validates the datasource URL against the schema's provider, and
 * `provider = "sqlite"` rejects a `libsql://` host with P1013 before anything
 * runs. The real work now happens in scripts/migrate-turso.mjs, over the same
 * libSQL client the application uses.
 */
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_SQL = "prisma/migrations/2026-add-description-requests.sql";
const file = process.argv[2] || DEFAULT_SQL;

const rl = readline.createInterface({ input, output });

console.log("=== Turso Schema Migration ===");
console.log(`Applying: ${file}`);
console.log("Take a backup first if you have not:  turso db shell <db> .dump > backup.sql\n");

const url = (await rl.question("Turso Database URL (libsql://...): ")).trim();
const token = (await rl.question("Turso Auth Token: ")).trim();
rl.close();

const child = spawn(process.execPath, ["scripts/migrate-turso.mjs", file], {
  env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token },
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
