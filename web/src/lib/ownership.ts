import { createHash, randomBytes } from "crypto";
import dns from "dns/promises";
import net from "net";
import { isIP } from "net";

export const TXT_PREFIX = "karmakoders-verify=";
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

export function instructionsFor(
  method: OwnershipMethod,
  domain: string,
  token: string,
  txtRecord: string
) {
  if (method === "dns_txt") {
    return {
      method,
      domain,
      summary: "Add a DNS TXT record, then click Verify.",
      steps: [
        `Create a TXT record on ${domain}`,
        `Set the value exactly to: ${txtRecord}`,
        "Wait for DNS to propagate, then click Verify ownership",
      ],
      txtRecord,
      httpPath: null as string | null,
      httpBody: null as string | null,
    };
  }
  return {
    method,
    domain,
    summary: "Publish a verification file, then click Verify.",
    steps: [
      `Create a file at https://${domain}${HTTP_PATH}`,
      `File body must be exactly: ${token}`,
      "Make sure the URL returns HTTP 200 as plain text, then click Verify ownership",
    ],
    txtRecord: null as string | null,
    httpPath: HTTP_PATH,
    httpBody: token,
  };
}

export async function verifyDnsTxt(domain: string, token: string): Promise<{ ok: boolean; reason?: string }> {
  await assertHostPublic(domain);
  const expected = `${TXT_PREFIX}${token}`;
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map((parts) => parts.join(""));
    for (const rec of flat) {
      const cleaned = rec.replace(/^"|"$/g, "").trim();
      if (cleaned === expected || cleaned === token || cleaned.includes(expected)) {
        return { ok: true };
      }
    }
    return { ok: false, reason: "txt_record_not_found" };
  } catch {
    return { ok: false, reason: "dns_lookup_failed" };
  }
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
