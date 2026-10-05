import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { requirePooledNeonUrl } from "../src/lib/database-url.mjs";
import { readMigration } from "./sql.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const databaseUrl = requirePooledNeonUrl(process.env.DATABASE_URL);
const sql = neon(databaseUrl);

await sql.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const appliedRows = await sql.query("SELECT id FROM schema_migrations");
const applied = new Set(appliedRows.map((row) => row.id));

const migrationsDir = join(root, "db", "migrations");
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip ${file}`);
    continue;
  }
  const statements = readMigration(join(migrationsDir, file));
  for (const statement of statements) {
    await sql.query(statement);
  }
  await sql.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
  console.log(`applied ${file}`);
}
