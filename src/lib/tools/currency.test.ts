import { afterEach, describe, expect, it, vi } from "vitest";
import { convertQuotePrices, getExchangeRate } from "@/lib/tools/currency";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("currency", () => {
  it("uses env override for INR to USD", async () => {
    vi.stubEnv("FX_INR_TO_USD", "0.012");
    const rate = await getExchangeRate("INR", "USD");
    expect(rate).toBe(0.012);
  });

  it("converts quote prices and keeps native catalog pricing", async () => {
    vi.stubEnv("FX_INR_TO_USD", "0.012");

    const converted = await convertQuotePrices(
      {
        currency: "INR",
        registrationPrice: 799,
        renewalPrice: 1299,
        transferPrice: 999,
      },
      "USD"
    );

    expect(converted.currency).toBe("USD");
    expect(converted.registrationPrice).toBe(9.59);
    expect(converted.renewalPrice).toBe(15.59);
    expect(converted.sourcePricing).toEqual({
      currency: "INR",
      registrationPrice: 799,
      renewalPrice: 1299,
      transferPrice: 999,
    });
  });

  it("leaves USD quotes unchanged", async () => {
    const quote = {
      currency: "USD",
      registrationPrice: 11.99,
      renewalPrice: 22.99,
      transferPrice: null,
    };
    const converted = await convertQuotePrices(quote, "USD");
    expect(converted).toEqual(quote);
  });
});
