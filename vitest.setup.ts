import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { loadEnvConfig } from "@next/env";

// Next.js skips .env.local when NODE_ENV=test (which Vitest sets), but local development and
// tests both use .env.local (the Neon dev branch — see docs/ENV.md). Load it explicitly first.
// override: false — anything already in process.env (CI, shell) always wins.
const envLocal = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: false, quiet: true });
}

// `dev: true` forces .env.local/.env precedence (never .env.production) --
// see scratch/verify-tenant-seed.ts for why this matters: omitting the
// second argument here would silently point tests at the production DB.
loadEnvConfig(process.cwd(), true);
