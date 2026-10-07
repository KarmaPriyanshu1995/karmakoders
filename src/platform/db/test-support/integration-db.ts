/**
 * Test-only helpers for DB integration tests (*.integration.test.ts).
 * Integration tests run against DATABASE_URL (the Neon dev branch locally, the postgres
 * service container in CI) and clear Platform/Sign data between runs.
 * Never import this from application code.
 */

export const INTEGRATION_WARNING =
  "Integration tests will clear dev data in platform_* and sign_* tables.";

/** Tables that are never truncated even though they match the prefix. */
export const PRESERVED_TABLES: ReadonlySet<string> = new Set(["sign_early_access"]);

const RESETTABLE_TABLE = /^(platform|sign)_[a-z0-9_]+$/;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

/** Reason to skip integration tests, or null when they can run. */
export function integrationSkipReason(env: NodeJS.ProcessEnv = process.env): string | null {
  if (!env.DATABASE_URL) return "DATABASE_URL is not set (expected in .env.local)";
  return null;
}

function databaseHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Throws when integration tests must not run here:
 * - NODE_ENV=production, or VERCEL_ENV=production|preview (never clear deployed data)
 * - a localhost database outside CI (CI uses a disposable postgres service container)
 */
export function assertSafeForIntegrationTests(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to run DB integration tests with NODE_ENV=production");
  }
  if (env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview") {
    throw new Error(`Refusing to run DB integration tests with VERCEL_ENV=${env.VERCEL_ENV}`);
  }
  const host = databaseHost(env.DATABASE_URL ?? "");
  if (LOCAL_HOSTS.has(host) && env.CI !== "true") {
    throw new Error(
      "Refusing to run DB integration tests against a localhost database outside CI; use the Neon dev branch in .env.local"
    );
  }
}

/** Keeps only platform_* / sign_* tables, minus preserved ones. Exported for unit tests. */
export function filterResettableTables(names: readonly string[]): string[] {
  return names.filter((name) => RESETTABLE_TABLE.test(name) && !PRESERVED_TABLES.has(name)).sort();
}

type RawClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

type TxCapable = RawClient & {
  $transaction<R>(fn: (tx: RawClient) => Promise<R>, options?: { timeout?: number; maxWait?: number }): Promise<R>;
};

/**
 * Truncates every platform_* and sign_* table (except PRESERVED_TABLES) in one transaction.
 * Append-only tables block TRUNCATE with *_no_truncate triggers (ADR 010); those triggers are
 * disabled and re-enabled inside the same transaction, so a failure rolls everything back and
 * the guard is never left off. No CASCADE: if any other table references these, the TRUNCATE
 * fails instead of spreading to CMS or preserved tables.
 */
export async function resetPlatformSignTables(prisma: TxCapable): Promise<string[]> {
  assertSafeForIntegrationTests();
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = current_schema()`
  );
  const tables = filterResettableTables(rows.map((r) => r.tablename));
  if (tables.length === 0) return [];

  await prisma.$transaction(
    async (tx) => {
      const guards = await tx.$queryRawUnsafe<{ table: string; trigger: string }[]>(
        `SELECT c.relname AS "table", t.tgname AS "trigger"
           FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
          WHERE c.relname = ANY($1::text[]) AND t.tgname LIKE '%\\_no\\_truncate' AND NOT t.tgisinternal`,
        tables
      );
      for (const g of guards) {
        await tx.$executeRawUnsafe(`ALTER TABLE "${g.table}" DISABLE TRIGGER "${g.trigger}"`);
      }
      await tx.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")}`);
      for (const g of guards) {
        await tx.$executeRawUnsafe(`ALTER TABLE "${g.table}" ENABLE TRIGGER "${g.trigger}"`);
      }
    },
    { timeout: 30_000, maxWait: 15_000 }
  );
  return tables;
}
