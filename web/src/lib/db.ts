import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { requirePooledNeonUrl } from "./database-url.mjs";

export type Sql = NeonQueryFunction<false, false>;

let cached: Sql | undefined;

export function getSql(): Sql {
  if (!cached) {
    cached = neon(requirePooledNeonUrl(process.env.DATABASE_URL));
  }
  return cached;
}
