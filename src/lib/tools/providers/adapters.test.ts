import { afterEach, describe, expect, it, vi } from "vitest";
import { godaddyAdapter } from "@/lib/tools/providers/godaddy";
import { namecheapAdapter } from "@/lib/tools/providers/namecheap";
import { porkbunAdapter } from "@/lib/tools/providers/porkbun";

const input = { domain: "example.com", sld: "example", tld: "com" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider adapters", () => {
  it("returns not_configured when secrets are missing", async () => {
    vi.stubEnv("GODADDY_API_KEY", "");
    vi.stubEnv("GODADDY_API_SECRET", "");
    const quote = await godaddyAdapter.check(input);
    expect(quote.status).toBe("not_configured");
    expect(quote.message).not.toMatch(/secret|api key/i);
  });

  it("normalizes a successful GoDaddy response", async () => {
    vi.stubEnv("GODADDY_API_KEY", "key");
    vi.stubEnv("GODADDY_API_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/available")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ available: true, price: 9990000, currency: "USD" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );
    const quote = await godaddyAdapter.check(input);
    expect(quote.status).toBe("ok");
    expect(quote.available).toBe(true);
    expect(quote.registrationPrice).toBe(9.99);
  });

  it("handles GoDaddy timeout", async () => {
    vi.stubEnv("GODADDY_API_KEY", "key");
    vi.stubEnv("GODADDY_API_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      })
    );
    const quote = await godaddyAdapter.check(input);
    expect(quote.status).toBe("timeout");
  });

  it("handles malformed Namecheap XML", async () => {
    vi.stubEnv("NAMECHEAP_API_USER", "user");
    vi.stubEnv("NAMECHEAP_API_KEY", "key");
    vi.stubEnv("NAMECHEAP_USERNAME", "user");
    vi.stubEnv("NAMECHEAP_CLIENT_IP", "1.1.1.1");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "<not-xml>",
      }))
    );
    const quote = await namecheapAdapter.check(input);
    expect(quote.status).toBe("invalid_response");
  });

  it("handles unavailable Porkbun domain", async () => {
    vi.stubEnv("PORKBUN_API_KEY", "key");
    vi.stubEnv("PORKBUN_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("checkDomain")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: "SUCCESS", response: { avail: "no", price: "0" } }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ status: "SUCCESS", pricing: {} }) };
      })
    );
    const quote = await porkbunAdapter.check(input);
    expect(quote.status).toBe("ok");
    expect(quote.available).toBe(false);
  });

  it("handles Porkbun API failure", async () => {
    vi.stubEnv("PORKBUN_API_KEY", "key");
    vi.stubEnv("PORKBUN_SECRET_KEY", "secret");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const quote = await porkbunAdapter.check(input);
    expect(quote.status).toBe("error");
    expect(quote.message).toContain("temporarily unavailable");
  });
});
