import { createSign } from "crypto";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo/sitemap-builder";
import { resolveIndexNowKey } from "@/lib/seo/indexnow-key";

export interface IndexingDetail {
  target: string;
  status: number | "skipped";
  note: string;
}

export interface IndexingReport {
  ok: boolean;
  summary: string;
  details: IndexingDetail[];
}

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function googleAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const key = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  const assertion = `${header}.${claims}.${signer.sign(key).toString("base64url")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token || null;
}

export async function submitForIndexing(input: {
  tenantId: string;
  url: string;
  userId?: string;
  triggeredBy?: string;
}): Promise<IndexingReport> {
  const details: IndexingDetail[] = [];
  const sitemap = `${SITE_URL}/sitemap.xml`;
  const host = new URL(SITE_URL).host;
  const key = resolveIndexNowKey();
  const keyLocation = `${SITE_URL}/api/indexnow/key`;

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation, urlList: [input.url] }),
      signal: AbortSignal.timeout(8000),
    });
    details.push({ target: "IndexNow", status: res.status, note: res.ok || res.status === 202 ? "Accepted" : "Not accepted" });
  } catch {
    details.push({ target: "IndexNow", status: "skipped", note: "Request failed" });
  }

  try {
    const res = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`, {
      signal: AbortSignal.timeout(8000),
    });
    details.push({ target: "Bing sitemap", status: res.status, note: res.ok ? "Pinged" : "Not accepted" });
  } catch {
    details.push({ target: "Bing sitemap", status: "skipped", note: "Request failed" });
  }

  try {
    const token = await googleAccessToken();
    if (!token) {
      details.push({
        target: "Google Indexing API",
        status: "skipped",
        note: "Set GOOGLE_INDEXING_CLIENT_EMAIL and GOOGLE_INDEXING_PRIVATE_KEY to enable",
      });
    } else {
      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ url: input.url, type: "URL_UPDATED" }),
        signal: AbortSignal.timeout(8000),
      });
      details.push({ target: "Google Indexing API", status: res.status, note: res.ok ? "URL_UPDATED sent" : "Not accepted" });
    }
  } catch {
    details.push({ target: "Google Indexing API", status: "skipped", note: "Request failed" });
  }

  const ok = details.some((item) => typeof item.status === "number" && item.status >= 200 && item.status < 300);
  const summary = details.map((item) => `${item.target}: ${item.note}`).join(" · ");

  try {
    await prisma.seoAutomationLog.create({
      data: {
        tenantId: input.tenantId,
        action: "index_ping",
        pageType: "tool",
        url: input.url,
        after: summary.slice(0, 2000),
        status: ok ? "success" : "error",
        triggeredBy: input.triggeredBy || input.userId || "admin",
      },
    });
  } catch {
    console.error("[indexing] could not write automation log");
  }

  return { ok, summary, details };
}

export async function notifyToolPublished(tenantId: string, slug: string, userId: string) {
  try {
    await submitForIndexing({
      tenantId,
      url: `${SITE_URL}/free-tools/${slug}`,
      userId,
      triggeredBy: "publish",
    });
  } catch {
    console.error("[indexing] publish ping failed");
  }
}
