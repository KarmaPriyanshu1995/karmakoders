import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load env files for the Prisma CLI with Next.js precedence. dotenv never overrides a variable
// that is already set, so the first file that defines a key wins and anything already in
// process.env (Vercel, CI) always wins over every file:
//   process.env > .env.local > .env
// Locally, .env.local holds DATABASE_URL for the Neon dev branch (docs/ENV.md).
const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false, quiet: true });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  // Prisma CLI only (migrate deploy/status, db execute). Prefer DIRECT_URL — the non-pooled
  // Neon connection that migrations need for session-level locks — and fall back to
  // DATABASE_URL. The app runtime ignores this file and keeps using the pooled DATABASE_URL
  // through the pg adapter in src/lib/prisma.ts.
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
