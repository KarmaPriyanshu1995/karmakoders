import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent, maskEmail, sanitizeLogFields } from "@/platform/logger";

describe("maskEmail", () => {
  it("keeps only the first character and the domain", () => {
    expect(maskEmail("john@example.com")).toBe("j***@example.com");
    expect(maskEmail("a@b.co")).toBe("a***@b.co");
  });

  it("fully masks invalid input", () => {
    expect(maskEmail("")).toBe("***");
    expect(maskEmail(null)).toBe("***");
    expect(maskEmail("no-at-sign")).toBe("***");
    expect(maskEmail("@example.com")).toBe("***");
  });
});

describe("sanitizeLogFields", () => {
  it("drops sensitive field names and undefined values", () => {
    expect(
      sanitizeLogFields({
        event: "x",
        code: "123456",
        otpCode: "123456",
        token: "t",
        sessionToken: "t",
        secret: "s",
        password: "p",
        apiKey: "k",
        html: "<p>",
        body: "b",
        reason: "wrong_code",
        missing: undefined,
      })
    ).toEqual({ event: "x", reason: "wrong_code" });
  });
});

describe("logEvent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one JSON line without sensitive fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logEvent("info", "otp_email_sent", { to: maskEmail("jane@example.com"), code: "999999" });
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0][0]);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "info", event: "otp_email_sent", to: "j***@example.com" });
    expect(line).not.toContain("999999");
  });
});
