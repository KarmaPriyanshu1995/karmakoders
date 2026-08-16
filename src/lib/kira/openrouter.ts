export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || undefined;
}

/** Prefer the free router so testing keeps working as free model IDs change. */
export function getOpenRouterModel(): string {
  return process.env.KIRA_TEXT_MODEL || process.env.KIRA_OPENROUTER_MODEL || "openrouter/free";
}

export function openRouterHeaders(apiKey: string): Record<string, string> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://www.karmakoders.com";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": site,
    "X-Title": "KarmaKoders Kira",
  };
}
