import { describe, expect, it } from "vitest";
import {
  assertSafeForIntegrationTests,
  filterResettableTables,
  integrationSkipReason,
} from "@/platform/db/test-support/integration-db";

const NEON = "postgresql://u:p@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("integration DB guard", () => {
  it("skips when DATABASE_URL is missing", () => {
    expect(integrationSkipReason({ NODE_ENV: "test" })).toMatch(/DATABASE_URL/);
    expect(integrationSkipReason({ NODE_ENV: "test", DATABASE_URL: NEON })).toBeNull();
  });

  it("allows the Neon dev branch in test mode", () => {
    expect(() => assertSafeForIntegrationTests({ NODE_ENV: "test", DATABASE_URL: NEON })).not.toThrow();
    expect(() =>
      assertSafeForIntegrationTests({ NODE_ENV: "test", DATABASE_URL: NEON, VERCEL_ENV: "development" })
    ).not.toThrow();
  });

  it("refuses production and preview environments", () => {
    expect(() => assertSafeForIntegrationTests({ NODE_ENV: "production", DATABASE_URL: NEON })).toThrow(
      /NODE_ENV=production/
    );
    for (const vercelEnv of ["production", "preview"]) {
      expect(() =>
        assertSafeForIntegrationTests({ NODE_ENV: "test", DATABASE_URL: NEON, VERCEL_ENV: vercelEnv })
      ).toThrow(new RegExp(`VERCEL_ENV=${vercelEnv}`));
    }
  });

  it("refuses localhost databases outside CI, allows the CI service container", () => {
    for (const host of ["localhost", "127.0.0.1"]) {
      const url = `postgresql://u:p@${host}:5432/postgres`;
      expect(() => assertSafeForIntegrationTests({ NODE_ENV: "test", DATABASE_URL: url })).toThrow(/localhost/);
      expect(() =>
        assertSafeForIntegrationTests({ NODE_ENV: "test", DATABASE_URL: url, CI: "true" })
      ).not.toThrow();
    }
  });
});

describe("filterResettableTables", () => {
  it("keeps only platform_* and sign_* tables and preserves sign_early_access", () => {
    expect(
      filterResettableTables([
        "users",
        "tenants",
        "memberships",
        "audit_logs",
        "_prisma_migrations",
        "platform_customers",
        "platform_credit_ledger",
        "sign_documents",
        "sign_early_access",
        "signups",
        "platformx",
        "seo_pages",
      ])
    ).toEqual(["platform_credit_ledger", "platform_customers", "sign_documents"]);
  });

  it("rejects names that could break out of quoting", () => {
    expect(filterResettableTables(['sign_x"; DROP TABLE users; --', "Sign_Docs"])).toEqual([]);
  });
});
