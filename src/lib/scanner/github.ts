/** GitHub App helpers for the Next.js scanner API (no tokens returned to clients). */

export function githubAppEnabled(): boolean {
  const mode = (process.env.GITHUB_APP_MODE || "").toLowerCase();
  const enabled = (process.env.GITHUB_APP_ENABLED || "").toLowerCase();
  if (mode === "mock") return true;
  return enabled === "true" || enabled === "1" || enabled === "yes";
}

export function githubAppMode(): "mock" | "app" | "pat_dev" | "disabled" {
  const mode = (process.env.GITHUB_APP_MODE || "").toLowerCase();
  if (mode === "mock" || mode === "app" || mode === "pat_dev") return mode;
  if (githubAppEnabled() && process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) {
    return "app";
  }
  if (process.env.GITHUB_PAT_DEV) return "pat_dev";
  if (githubAppEnabled()) return "mock";
  return "disabled";
}

export function githubInstallUrl(): string | null {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) return null;
  return `https://github.com/apps/${slug}/installations/new`;
}

export function webhookSecret(): string | null {
  return process.env.GITHUB_APP_WEBHOOK_SECRET || null;
}
