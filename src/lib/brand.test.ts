import { describe, expect, it } from "vitest";
import { brandPhones, isBookableUrl } from "./brand";

describe("brandPhones", () => {
  it("lists India only when US is empty", () => {
    const phones = brandPhones({
      inPhoneDisplay: "+91 86900 71861",
      inPhoneTel: "+918690071861",
      usPhoneDisplay: "",
    });
    expect(phones.map((p) => p.label)).toEqual(["India"]);
  });

  it("lists US first when a US number is set", () => {
    const phones = brandPhones({
      inPhoneDisplay: "+91 86900 71861",
      inPhoneTel: "+918690071861",
      usPhoneDisplay: "+1 555 0100",
    });
    expect(phones[0]).toMatchObject({ label: "US", display: "+1 555 0100", tel: "+15550100" });
    expect(phones[1].label).toBe("India");
  });
});

describe("isBookableUrl", () => {
  it("rejects a host-only Cal homepage", () => {
    expect(isBookableUrl("https://cal.com")).toBe(false);
    expect(isBookableUrl("https://calendly.com/")).toBe(false);
  });

  it("accepts a username or event path", () => {
    expect(isBookableUrl("https://cal.com/karmakoders")).toBe(true);
    expect(isBookableUrl("https://calendly.com/team/intro")).toBe(true);
  });

  it("rejects unrelated hosts", () => {
    expect(isBookableUrl("https://example.com/book")).toBe(false);
  });
});
