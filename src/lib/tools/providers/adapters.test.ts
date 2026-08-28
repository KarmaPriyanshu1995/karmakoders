import { afterEach, describe, expect, it, vi } from "vitest";
import { godaddyAdapter } from "@/lib/tools/providers/godaddy";
import { hostingerAdapter } from "@/lib/tools/providers/hostinger";
import { namecheapAdapter } from "@/lib/tools/providers/namecheap";
import { porkbunAdapter } from "@/lib/tools/providers/porkbun";

const input = { domain: "example.com", sld: "example", tld: "com" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider adapters", () => {
  it("returns not_configured when secrets are missing", async () => {
    vi.stubEnv("GODADDY_PAT", "");
    vi.stubEnv("GODADDY_API_KEY", "");
    vi.stubEnv("GODADDY_API_SECRET", "");
    const quote = await godaddyAdapter.check(input);
    expect(quote.status).toBe("not_configured");
    expect(quote.message).not.toMatch(/secret|api key|pat/i);
  });

  it("normalizes a successful GoDaddy v3 response", async () => {
    vi.stubEnv("GODADDY_PAT", "pat-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/v3/domains/check-availability")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              domain: "example.com",
              available: true,
              prices: [
                {
                  term: "YEAR",
                  period: 1,
                  price: { currencyCode: "USD", value: 1199 },
                  renewalPrice: { currencyCode: "USD", value: 2299 },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );
    const quote = await godaddyAdapter.check(input);
    expect(quote.status).toBe("ok");
    expect(quote.available).toBe(true);
    expect(quote.registrationPrice).toBe(11.99);
    expect(quote.renewalPrice).toBe(22.99);
  });

  it("normalizes a successful legacy GoDaddy response", async () => {
    vi.stubEnv("GODADDY_PAT", "");
    vi.stubEnv("GODADDY_API_KEY", "key");
    vi.stubEnv("GODADDY_API_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/v1/domains/available")) {
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
    vi.stubEnv("GODADDY_PAT", "pat-token");
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

  it("falls back to TLD pricing when v3 omits prices for taken domains", async () => {
    vi.stubEnv("GODADDY_PAT", "pat-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("startup.co")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ domain: "startup.co", available: false, inventory: "REGISTRY" }),
          };
        }
        if (String(url).includes("karmakoderpriceprobe0001.co")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              domain: "karmakoderpriceprobe0001.co",
              available: true,
              prices: [
                {
                  term: "YEAR",
                  period: 1,
                  price: { currencyCode: "USD", value: 999 },
                  renewalPrice: { currencyCode: "USD", value: 4299 },
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );
    const quote = await godaddyAdapter.check({ domain: "startup.co", sld: "startup", tld: "co" });
    expect(quote.status).toBe("ok");
    expect(quote.available).toBe(false);
    expect(quote.registrationPrice).toBe(9.99);
    expect(quote.renewalPrice).toBe(42.99);
    expect(quote.indicative).toBe(true);
  });

  it("falls back to OTE when production legacy keys are rejected", async () => {
    vi.stubEnv("GODADDY_PAT", "");
    vi.stubEnv("GODADDY_API_KEY", "key");
    vi.stubEnv("GODADDY_API_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("api.godaddy.com/v1/domains/available")) {
          return { ok: false, status: 401, json: async () => ({ code: "UNABLE_TO_AUTHENTICATE" }) };
        }
        if (String(url).includes("api.ote-godaddy.com/v1/domains/available")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ available: true, price: 12990000, currency: "USD" }),
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );
    const quote = await godaddyAdapter.check(input);
    expect(quote.status).toBe("ok");
    expect(quote.available).toBe(true);
    expect(quote.registrationPrice).toBe(12.99);
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

  it("returns not_configured when Hostinger token is missing", async () => {
    vi.stubEnv("HOSTINGER_API_TOKEN", "");
    const quote = await hostingerAdapter.check(input);
    expect(quote.status).toBe("not_configured");
  });

  it("normalizes a successful Hostinger response", async () => {
    vi.stubEnv("HOSTINGER_API_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/availability")) {
          return {
            ok: true,
            status: 200,
            json: async () => [{ domain: "example.com", is_available: true, restriction: null }],
          };
        }
        if (String(url).includes("/catalog")) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: "hostingerin-domain-com",
                name: ".COM Domain",
                category: "DOMAIN",
                prices: [
                  {
                    currency: "USD",
                    price: 1499,
                    first_period_price: 899,
                    period: 1,
                    period_unit: "year",
                  },
                ],
              },
              {
                id: "hostingerin-domaintransfer-com",
                name: "Domain Transfer",
                category: "DOMAIN",
                prices: [{ currency: "USD", price: 969, first_period_price: 0, period: 0, period_unit: "" }],
              },
            ],
          };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      })
    );

    const quote = await hostingerAdapter.check(input);
    expect(quote.status).toBe("ok");
    expect(quote.available).toBe(true);
    expect(quote.registrationPrice).toBe(8.99);
    expect(quote.renewalPrice).toBe(14.99);
    expect(quote.transferPrice).toBe(9.69);
    expect(quote.currency).toBe("USD");
  });
});
