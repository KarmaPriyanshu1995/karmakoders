export function requirePooledNeonUrl(url) {
  if (!url) {
    throw new Error(
      "SCANNER_DATABASE_URL is not set. Paste the scanner Neon pooled connection string into .env.local (and Vercel env).",
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SCANNER_DATABASE_URL is not a valid URL.");
  }

  if (!parsed.hostname.endsWith(".neon.tech")) {
    throw new Error("SCANNER_DATABASE_URL must be a Neon connection string (host ends with .neon.tech).");
  }

  if (!parsed.hostname.includes("-pooler")) {
    throw new Error(
      "SCANNER_DATABASE_URL must be the Neon pooled connection string. The host should contain -pooler.",
    );
  }

  return url;
}
