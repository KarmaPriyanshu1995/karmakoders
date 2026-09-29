import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { statements } from "./sql.mjs";

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
  "001_init.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const tables = [
  "users",
  "projects",
  "verified_domains",
  "scans",
  "scan_jobs",
  "scan_events",
  "findings",
  "evidence",
];

test("migration defines every phase 1 table", () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }
});

test("migration statements are non-empty and do not include the migration ledger", () => {
  const parsed = statements(sql);
  assert.ok(parsed.length >= tables.length);
  for (const statement of parsed) {
    assert.doesNotMatch(statement, /schema_migrations/);
    assert.doesNotMatch(statement, /--/);
  }
});

test("findings keep a fingerprint and scan jobs can be claimed with SKIP LOCKED", () => {
  assert.match(sql, /fingerprint text NOT NULL/);
  assert.match(sql, /UNIQUE \(scan_id, fingerprint\)/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /verified_at timestamptz/);
});
