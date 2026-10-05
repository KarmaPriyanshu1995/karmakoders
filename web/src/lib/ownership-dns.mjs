// DNS TXT ownership: the claimed host and the verification hostname are
// different values. The TXT record always lives at
//   _karmakoders-verify.<claimed host>
// so a CNAME on the claimed host (e.g. www → Vercel) never conflicts, and
// apex / www / app claims each need their own record. Mirrored in
// engine/lib/ownership/challenge.py — keep both in sync.

export const TXT_PREFIX = "karmakoders-verify=";
export const VERIFY_LABEL = "_karmakoders-verify";

// Public suffixes with two labels, so "shop.example.co.uk" → zone "example.co.uk".
// Only used for the provider-facing record *name* hint; the lookup itself
// always uses the full verification hostname.
const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk",
  "co.in", "net.in", "org.in", "firm.in", "gen.in", "ind.in", "ac.in", "edu.in", "gov.in",
  "com.au", "net.au", "org.au", "edu.au", "gov.au",
  "co.nz", "net.nz", "org.nz",
  "co.jp", "ne.jp", "or.jp", "ac.jp",
  "co.za", "org.za",
  "com.br", "net.br", "org.br",
  "com.mx", "com.ar", "com.sg", "com.my", "com.hk", "com.tw",
  "com.cn", "net.cn", "org.cn", "co.kr", "or.kr", "com.tr", "co.id",
  "com.ph", "com.pk", "com.ng", "co.il", "com.sa", "com.eg", "com.vn", "co.th",
]);

export function normalizeDnsName(name) {
  return String(name ?? "").trim().toLowerCase().replace(/\.$/, "");
}

/** Zone the user most likely edits at their DNS provider (e.g. karmakoders.com). */
export function registrableDomain(host) {
  const labels = normalizeDnsName(host).split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  const take = MULTI_LABEL_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** Exact FQDN the verifier queries. Derived only from the claimed host. */
export function verificationHostnameFor(claimedHost) {
  const host = normalizeDnsName(claimedHost);
  if (!host) throw new Error("missing_claimed_host");
  return `${VERIFY_LABEL}.${host}`;
}

/** Record "Name" to type into a DNS provider (relative to the zone). */
export function dnsRecordNameFor(claimedHost) {
  const host = normalizeDnsName(claimedHost);
  const zone = registrableDomain(host);
  if (host === zone) return VERIFY_LABEL;
  return `${VERIFY_LABEL}.${host.slice(0, -(zone.length + 1))}`;
}

export function expectedTxtValue(token) {
  return `${TXT_PREFIX}${token}`;
}

/** Protocol-level cleanup only: chunk join, surrounding whitespace/quotes. Token is never altered. */
export function normalizeTxtValue(record) {
  const joined = Array.isArray(record) ? record.join("") : String(record ?? "");
  let v = joined.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).trim();
  return v;
}

/** True only when one TXT value equals the expected value exactly. No substring matching. */
export function txtRecordsContain(records, expectedValue) {
  return (records ?? []).some((r) => normalizeTxtValue(r) === expectedValue);
}

export function txtNotFoundMessage(verificationHostname) {
  return (
    `TXT verification record was not found at ${verificationHostname}. ` +
    "Confirm the DNS record name and value, wait for propagation, then try again."
  );
}

// Failure codes for DNS TXT verification. Only "transient" ones are retried.
export const DNS_FAILURE_CODES = [
  "txt_record_not_found", // name exists, but no TXT / no karmakoders-verify value
  "wrong_token", // a karmakoders-verify value exists but is not this challenge's
  "dns_nxdomain", // verification hostname does not exist at all
  "dns_timeout",
  "dns_servfail",
  "dns_permission_error", // resolver REFUSED
  "dns_resolution_error",
];
export const TRANSIENT_DNS_CODES = new Set(["dns_timeout", "dns_servfail", "dns_resolution_error"]);

/** Map a Node `dns` error code to a verification failure code. */
export function classifyNodeDnsError(code) {
  switch (code) {
    case "ENOTFOUND":
      return "dns_nxdomain";
    case "ENODATA":
      return "txt_record_not_found";
    case "ETIMEOUT":
      return "dns_timeout";
    case "ESERVFAIL":
      return "dns_servfail";
    case "EREFUSED":
      return "dns_permission_error";
    default:
      return "dns_resolution_error";
  }
}

/** Actionable, secret-free message for each failure code. */
export function dnsFailureMessage(code, verificationHostname) {
  switch (code) {
    case "txt_record_not_found":
      return txtNotFoundMessage(verificationHostname);
    case "wrong_token":
      return (
        `A karmakoders-verify TXT record exists at ${verificationHostname}, but its value does not match ` +
        "this challenge. Copy the full value again, update the record, then retry."
      );
    case "dns_nxdomain":
      return (
        `The verification hostname ${verificationHostname} does not currently exist in DNS. ` +
        "Check the record Name at your DNS provider, wait for propagation, then try again."
      );
    case "dns_timeout":
      return "DNS lookup timed out. Try again.";
    case "dns_servfail":
      return "Your domain's DNS servers returned an error (SERVFAIL). Try again in a few minutes.";
    case "dns_permission_error":
      return "The DNS resolver refused the lookup. Try again in a few minutes.";
    default:
      return "DNS lookup did not complete. Try again in a few minutes.";
  }
}
