import { createHash, randomBytes } from "crypto";
import dns from "dns/promises";
import net from "net";
import { isIP } from "net";
import {
  TRANSIENT_DNS_CODES,
  TXT_PREFIX,
  classifyNodeDnsError,
  dnsFailureMessage,
  dnsRecordNameFor,
  expectedTxtValue,
  normalizeTxtValue,
  registrableDomain,
  txtRecordsContain,
  verificationHostnameFor,
} from "./ownership-dns.mjs";

export { TXT_PREFIX, dnsRecordNameFor, verificationHostnameFor };
export const HTTP_PATH = "/.well-known/karmakoders-verify.txt";
export const CHALLENGE_TTL_MS = 24 * 60 * 60 * 1000;
export const VERIFIED_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type OwnershipMethod = "dns_txt" | "http_file";
export type OwnershipStatus = "pending" | "verified" | "failed" | "expired" | "revoked" | "unverified";

export function normalizeHost(host: string): string {
  let h = host.trim().toLowerCase().replace(/\.$/, "");
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  return h;
}

export function hostsEquivalent(a: string, b: string): boolean {
  const x = normalizeHost(a);
  const y = normalizeHost(b);
  if (x === y) return true;
  if (x.startsWith("www.") && x.slice(4) === y) return true;
  if (y.startsWith("www.") && y.slice(4) === x) return true;
  return false;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newChallengeToken(): { token: string; tokenHash: string; txtRecord: string } {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    txtRecord: `${TXT_PREFIX}${token}`,
  };
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
      return true;
    }
  }
  return false;
}

export function isLoopbackHost(host: string): boolean {
  const h = normalizeHost(host);
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (isIP(h)) return isBlockedIp(h) && (h.startsWith("127.") || h === "::1");
  return false;
}

export function isSafePublicHostname(host: string): boolean {
  const h = normalizeHost(host);
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return false;
  if (h === "metadata" || h === "metadata.google.internal") return false;
  if (isIP(h)) return !isBlockedIp(h);
  return true;
}

export function allowLoopbackFromEnv(): boolean {
  const v = (process.env.OWNERSHIP_ALLOW_LOOPBACK || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function assertHostPublic(host: string): Promise<void> {
  const h = normalizeHost(host);
  const loopbackOk = allowLoopbackFromEnv() && isLoopbackHost(h);
  if (loopbackOk) return;
  if (!isSafePublicHostname(h)) {
    throw new Error(`host_not_allowed:${h}`);
  }
  if (isIP(h)) return;
  try {
    const results = await dns.lookup(h, { all: true });
    for (const r of results) {
      if (isBlockedIp(r.address)) {
        throw new Error(`host_resolves_private:${h}`);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("host_")) throw err;
    // NXDOMAIN etc. — let verify fail later
  }
}

export function hostFromUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("scheme_not_allowed");
  }
  if (!parsed.hostname) throw new Error("missing_hostname");
  return normalizeHost(parsed.hostname);
}

export type OwnershipInstructions = {
  method: OwnershipMethod;
  domain: string;
  claimedHost: string;
  summary: string;
  steps: string[];
  // DNS TXT (null for http_file)
  verificationHostname: string | null;
  dnsRecordName: string | null;
  recordType: "TXT" | null;
  txtValue: string | null;
  ttl: string | null;
  txtRecord: string | null;
  cnameNote: string | null;
  // HTTP file (null for dns_txt)
  httpPath: string | null;
  httpBody: string | null;
};

export function instructionsFor(args: {
  method: OwnershipMethod;
  claimedHost: string;
  token: string;
  /** Stored value; must equal the one derived from claimedHost. */
  verificationHostname?: string | null;
  claimedHostIsCname?: boolean;
}): OwnershipInstructions {
  const claimedHost = normalizeHost(args.claimedHost);
  if (args.method === "dns_txt") {
    const verificationHostname = args.verificationHostname || verificationHostnameFor(claimedHost);
    const dnsRecordName = dnsRecordNameFor(claimedHost);
    const txtValue = expectedTxtValue(args.token);
    return {
      method: "dns_txt",
      domain: claimedHost,
      claimedHost,
      summary: "Add a DNS TXT record",
      steps: [
        "Create the following DNS record in your domain provider:",
        `Type: TXT`,
        `Name: ${dnsRecordName}`,
        `Value: ${txtValue}`,
        "TTL: 1 hour / default",
        "Then click Verify ownership.",
      ],
      verificationHostname,
      dnsRecordName,
      recordType: "TXT",
      txtValue,
      ttl: "1 hour / default",
      txtRecord: txtValue,
      cnameNote: args.claimedHostIsCname
        ? `${claimedHost} uses a CNAME, so verification uses a separate DNS record and does not modify your existing website record.`
        : null,
      httpPath: null,
      httpBody: null,
    };
  }
  return {
    method: "http_file",
    domain: claimedHost,
    claimedHost,
    summary: "Publish a verification file, then click Verify.",
    steps: [
      `Create a file at https://${claimedHost}${HTTP_PATH}`,
      `File body must be exactly: ${args.token}`,
      "Make sure the URL returns HTTP 200 as plain text, then click Verify ownership",
    ],
    verificationHostname: null,
    dnsRecordName: null,
    recordType: null,
    txtValue: null,
    ttl: null,
    txtRecord: null,
    cnameNote: null,
    httpPath: HTTP_PATH,
    httpBody: args.token,
  };
}

/** Informational only: whether the claimed host is a CNAME (e.g. www → Vercel). */
export async function hostIsCname(host: string): Promise<boolean> {
  try {
    const records = await dns.resolveCname(normalizeHost(host));
    return records.length > 0;
  } catch {
    return false;
  }
}

export type DnsVerifyOutcome = {
  ok: boolean;
  reason?: string;
  message?: string;
  verificationHostname: string;
  dnsRecordName: string;
  /** Diagnostic only: the exact expected value was found at this OTHER name. Never grants ownership. */
  misplacedAt?: string | null;
  hint?: string | null;
};

type TxtResolver = (name: string) => Promise<string[][]>;

// Fresh resolver per call: c-ares keeps no answer cache, so no stale negative
// results inside the app. Public resolvers may still negatively cache a missing
// name for the zone's SOA minimum TTL (karmakoders.com: 300 s).
function systemTxtResolver(): { resolve: TxtResolver; id: string } {
  const resolver = new dns.Resolver({ timeout: 2500, tries: 1 });
  return {
    resolve: (name) => resolver.resolveTxt(name),
    id: `system(${resolver.getServers().join(",")})`,
  };
}

const RETRY_DELAYS_MS = [500, 1500]; // bounded: at most 3 attempts, transient errors only

type Lookup = { records: string[][] } | { error: string };

async function lookupTxt(resolve: TxtResolver, name: string, sleep: (ms: number) => Promise<void>): Promise<Lookup> {
  for (let attempt = 0; ; attempt++) {
    try {
      return { records: await resolve(name) };
    } catch (err) {
      const code = classifyNodeDnsError((err as NodeJS.ErrnoException)?.code);
      if (!TRANSIENT_DNS_CODES.has(code) || attempt >= RETRY_DELAYS_MS.length) return { error: code };
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * Verify a DNS TXT challenge. Resolves TXT ONLY at the verification hostname
 * derived from the claimed host, and requires an exact value match.
 */
export async function verifyDnsTxt(args: {
  claimedHost: string;
  token: string;
  storedVerificationHostname?: string | null;
  resolveTxt?: TxtResolver;
  sleep?: (ms: number) => Promise<void>;
  log?: (entry: Record<string, unknown>) => void;
}): Promise<DnsVerifyOutcome> {
  const claimedHost = normalizeHost(args.claimedHost);
  const verificationHostname = verificationHostnameFor(claimedHost);
  const dnsRecordName = dnsRecordNameFor(claimedHost);
  const base = { verificationHostname, dnsRecordName };
  if (
    args.storedVerificationHostname &&
    normalizeHost(args.storedVerificationHostname) !== verificationHostname
  ) {
    // Challenge row is not bound to this claimed host — never look elsewhere.
    return {
      ...base,
      ok: false,
      reason: "verification_hostname_mismatch",
      message: "This challenge does not belong to the claimed host. Create a new DNS challenge.",
    };
  }
  await assertHostPublic(claimedHost);

  const expected = expectedTxtValue(args.token);
  const system = args.resolveTxt ? null : systemTxtResolver();
  const resolve = args.resolveTxt ?? system!.resolve;
  const sleep = args.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = args.log ?? ((entry) => console.info("[ownership] dns verification lookup", JSON.stringify(entry)));

  const started = Date.now();
  const result = await lookupTxt(resolve, verificationHostname, sleep);
  const records = "records" in result ? result.records : [];
  const matched = "records" in result && txtRecordsContain(records, expected);

  let reason: string | undefined;
  if (!matched) {
    if ("error" in result) reason = result.error;
    else if (records.some((r) => normalizeTxtValue(r).startsWith(TXT_PREFIX))) reason = "wrong_token";
    else reason = "txt_record_not_found";
  }

  // Diagnostic only (never grants ownership): did the user put THIS challenge's
  // value at the parent zone's name (e.g. apex instead of www)? Common mistake.
  let misplacedAt: string | null = null;
  const zoneHostname = verificationHostnameFor(registrableDomain(claimedHost));
  if (!matched && zoneHostname !== verificationHostname) {
    const parent = await lookupTxt(resolve, zoneHostname, sleep);
    if ("records" in parent && txtRecordsContain(parent.records, expected)) misplacedAt = zoneHostname;
  }

  // Safe fields only — never the token or any TXT contents.
  log({
    claimedHost,
    verificationHostname,
    dnsRecordName,
    method: "dns_txt",
    resolver: system?.id ?? "injected",
    durationMs: Date.now() - started,
    recordCount: records.length,
    matched,
    errorType: reason ?? null,
    misplacedAt,
  });

  if (matched) return { ...base, ok: true };
  return {
    ...base,
    ok: false,
    reason,
    message: dnsFailureMessage(reason, verificationHostname),
    misplacedAt,
    hint: misplacedAt
      ? `We found this challenge's value at ${misplacedAt}, which proves ${registrableDomain(claimedHost)} — ` +
        `not ${claimedHost}. Change the record Name at your DNS provider to ${dnsRecordName}, then verify again.`
      : null,
  };
}

export async function verifyHttpFile(
  primaryUrl: string,
  token: string
): Promise<{ ok: boolean; reason?: string }> {
  const parsed = new URL(primaryUrl);
  const host = normalizeHost(parsed.hostname);
  await assertHostPublic(host);

  const target = new URL(HTTP_PATH, `${parsed.protocol}//${parsed.host}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "AppSecurityScanner/0.1 (+ownership-verify)", Accept: "text/plain,*/*" },
    });
    // Manual redirect handling — only same host
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) return { ok: false, reason: "redirect_missing_location" };
      const next = new URL(loc, target);
      if (!hostsEquivalent(host, next.hostname)) {
        return { ok: false, reason: "redirect_off_host" };
      }
      const resp2 = await fetch(next.toString(), {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
        headers: { "User-Agent": "AppSecurityScanner/0.1 (+ownership-verify)", Accept: "text/plain,*/*" },
      });
      if (!resp2.ok) return { ok: false, reason: `http_status_${resp2.status}` };
      const body = (await resp2.text()).trim();
      const first = body.split(/\r?\n/)[0]?.trim() ?? "";
      if (body === token || first === token || body === `${TXT_PREFIX}${token}` || first === `${TXT_PREFIX}${token}`) {
        return { ok: true };
      }
      return { ok: false, reason: "token_mismatch" };
    }
    if (!resp.ok) return { ok: false, reason: `http_status_${resp.status}` };
    const finalHost = new URL(resp.url).hostname;
    if (!hostsEquivalent(host, finalHost)) {
      return { ok: false, reason: "redirect_off_host" };
    }
    const body = (await resp.text()).trim();
    const first = body.split(/\r?\n/)[0]?.trim() ?? "";
    if (body === token || first === token || body === `${TXT_PREFIX}${token}` || first === `${TXT_PREFIX}${token}`) {
      return { ok: true };
    }
    return { ok: false, reason: "token_mismatch" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch_error";
    return { ok: false, reason: `fetch_error:${msg.slice(0, 80)}` };
  } finally {
    clearTimeout(timer);
  }
}
