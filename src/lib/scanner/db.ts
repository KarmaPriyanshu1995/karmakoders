import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requirePooledNeonUrl } from "./database-url.mjs";

export type Sql = NeonQueryFunction<false, false>;

let cached: Sql | undefined;

// The scanner lives on its own Neon database (shared with the Python worker).
// DATABASE_URL belongs to the main site's Prisma database, so use a separate var.
export function getSql(): Sql {
  if (!cached) {
    cached = neon(requirePooledNeonUrl(process.env.SCANNER_DATABASE_URL));
  }
  return cached;
}
