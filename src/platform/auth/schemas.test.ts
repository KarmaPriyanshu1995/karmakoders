import { describe, expect, it } from "vitest";
import {
  emailSchema,
  otpCodeSchema,
  otpRequestBodySchema,
  otpVerifyBodySchema,
} from "@/platform/auth/schemas";

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Jane.Doe@Example.COM ")).toBe("jane.doe@example.com");
  });

  it("rejects invalid formats", () => {
    for (const bad of ["", "jane", "jane@", "@example.com", "jane@example", "a b@example.com"]) {
      expect(emailSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("rejects addresses longer than 254 characters", () => {
    const local = "a".repeat(64);
    const domain = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`;
    const tooLong = `${local}@${domain}`;
    expect(tooLong.length).toBeGreaterThan(254);
    expect(emailSchema.safeParse(tooLong).success).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(emailSchema.safeParse(42).success).toBe(false);
    expect(emailSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpCodeSchema.parse("012345")).toBe("012345");
    expect(otpCodeSchema.parse(" 123456 ")).toBe("123456");
  });

  it("rejects anything else", () => {
    for (const bad of ["12345", "1234567", "12a456", "", "١٢٣٤٥٦", 123456]) {
      expect(otpCodeSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("request/verify body schemas", () => {
  it("parse valid bodies", () => {
    expect(otpRequestBodySchema.parse({ email: "A@B.co" })).toEqual({ email: "a@b.co" });
    expect(otpVerifyBodySchema.parse({ email: "a@b.co", code: "000000" })).toEqual({
      email: "a@b.co",
      code: "000000",
    });
  });

  it("reject missing fields", () => {
    expect(otpVerifyBodySchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(otpRequestBodySchema.safeParse({}).success).toBe(false);
  });
});
