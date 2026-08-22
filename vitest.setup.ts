import { loadEnvConfig } from "@next/env";

// `dev: true` forces .env.local/.env precedence (never .env.production) --
// see scratch/verify-tenant-seed.ts for why this matters: omitting the
// second argument here would silently point tests at the production DB.
loadEnvConfig(process.cwd(), true);
