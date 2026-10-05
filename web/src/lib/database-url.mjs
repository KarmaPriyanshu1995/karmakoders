export function requirePooledNeonUrl(url) {
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy web/env.example to web/.env.local and paste the Neon pooled connection string.",
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  if (!parsed.hostname.endsWith(".neon.tech")) {
    throw new Error("DATABASE_URL must be a Neon connection string (host ends with .neon.tech).");
  }

  if (!parsed.hostname.includes("-pooler")) {
    throw new Error(
      "DATABASE_URL must be the Neon pooled connection string. The host should contain -pooler.",
    );
  }

  return url;
}
