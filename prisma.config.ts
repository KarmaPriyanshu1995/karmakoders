import "dotenv/config";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Match Next.js: dev-only DB overrides live in .env.development.local, not .env.local
if (process.env.NODE_ENV !== "production") {
  const devLocalPath = path.resolve(process.cwd(), ".env.development.local");
  if (fs.existsSync(devLocalPath)) {
    dotenv.config({ path: devLocalPath, override: true });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
