import assert from "node:assert/strict";
import test from "node:test";
import { requirePooledNeonUrl } from "../src/lib/database-url.mjs";

test("rejects missing, local, and unpooled database URLs", () => {
  assert.throws(() => requirePooledNeonUrl(undefined), /DATABASE_URL is not set/);
  assert.throws(
    () => requirePooledNeonUrl("postgresql://user:pass@localhost/postgres"),
    /Neon connection string/,
  );
  assert.throws(
    () =>
      requirePooledNeonUrl(
        "postgresql://user:pass@ep-example.us-east-1.aws.neon.tech/neondb",
      ),
    /-pooler/,
  );
});

test("accepts a Neon pooled connection string", () => {
  const url = "postgresql://user:pass@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
  assert.equal(requirePooledNeonUrl(url), url);
});
