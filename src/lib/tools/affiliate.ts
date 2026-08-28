const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function isSafeRedirectUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return false;
    if (!url.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export function appendDomainToTrackingUrl(trackingUrl: string, domain?: string | null): string {
  if (!domain) return trackingUrl;
  try {
    const url = new URL(trackingUrl);
    if (url.searchParams.has("domain") || url.searchParams.has("q")) {
      return url.toString();
    }
    if (url.hostname.includes("godaddy.com")) {
      url.searchParams.set("domainToCheck", domain);
    } else if (url.hostname.includes("porkbun.com")) {
      url.searchParams.set("q", domain);
    } else {
      url.searchParams.set("domain", domain);
    }
    return url.toString();
  } catch {
    return trackingUrl;
  }
}

export function sanitizeSessionId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(trimmed)) return null;
  return trimmed;
}
