const BLOCKED_TLDS = new Set([
  "local",
  "localhost",
  "test",
  "invalid",
  "example",
  "onion",
  "internal",
  "lan",
]);

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export interface NormalizedDomain {
  domain: string;
  sld: string;
  tld: string;
  assumedTld: boolean;
}

export type DomainParseResult =
  | { ok: true; value: NormalizedDomain }
  | { ok: false; message: string };

export function parseDomainInput(raw: string): DomainParseResult {
  if (typeof raw !== "string") {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  let value = raw.trim().toLowerCase();
  if (!value) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^\/\//, "");

  const slash = value.search(/[/?#]/);
  if (slash >= 0) value = value.slice(0, slash);

  value = value.replace(/\.+$/, "");
  value = value.replace(/^www\./, "");

  if (!value) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  if (/[^a-z0-9.-]/.test(value)) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  if (value.startsWith(".") || value.endsWith("-") || value.includes("..") || value.includes(".-") || value.includes("-.")) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  let assumedTld = false;
  if (!value.includes(".")) {
    if (!LABEL_RE.test(value) || value.length > 63) {
      return { ok: false, message: "Please enter a valid domain name." };
    }
    value = `${value}.com`;
    assumedTld = true;
  }

  const labels = value.split(".");
  if (labels.length < 2 || labels.some((label) => !LABEL_RE.test(label))) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  const tld = labels[labels.length - 1];
  const sld = labels[labels.length - 2];

  if (tld.length < 2 || tld.length > 24) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  if (BLOCKED_TLDS.has(tld)) {
    return { ok: false, message: "That domain extension is not supported." };
  }

  const domain = `${sld}.${tld}`;
  if (domain.length > 253) {
    return { ok: false, message: "Please enter a valid domain name." };
  }

  return { ok: true, value: { domain, sld, tld, assumedTld } };
}

export function alternativeDomains(sld: string, currentTld: string): string[] {
  const suggestions = ["net", "co", "io", "ai", "org", "app", "dev"].filter((tld) => tld !== currentTld);
  return suggestions.slice(0, 4).map((tld) => `${sld}.${tld}`);
}
