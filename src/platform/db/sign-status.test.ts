import { describe, expect, it } from "vitest";
import { SignDocumentStatus } from "@prisma/client";
import {
  canTransitionSignStatus,
  freeUsagePeriodKey,
  SIGN_DOCUMENT_STATUSES,
  SIGN_STATUS_TRANSITIONS,
} from "@/platform/db/sign-status";

describe("freeUsagePeriodKey", () => {
  it("formats UTC year-month", () => {
    expect(freeUsagePeriodKey(new Date("2026-09-30T23:30:00.000Z"))).toBe("2026-09");
    expect(freeUsagePeriodKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
  });
});

describe("Sign document status machine", () => {
  it("matches the Prisma SignDocumentStatus enum exactly", () => {
    expect([...SIGN_DOCUMENT_STATUSES].sort()).toEqual(Object.values(SignDocumentStatus).sort());
  });

  it("allows the happy path DRAFT → SENT → PARTIALLY_SIGNED → COMPLETED", () => {
    expect(canTransitionSignStatus("DRAFT", "SENT")).toBe(true);
    expect(canTransitionSignStatus("SENT", "PARTIALLY_SIGNED")).toBe(true);
    expect(canTransitionSignStatus("PARTIALLY_SIGNED", "COMPLETED")).toBe(true);
    expect(canTransitionSignStatus("SENT", "COMPLETED")).toBe(true);
  });

  it("allows void before completion but never after", () => {
    for (const from of ["DRAFT", "SENT", "PARTIALLY_SIGNED"] as const) {
      expect(canTransitionSignStatus(from, "VOIDED")).toBe(true);
    }
    expect(canTransitionSignStatus("COMPLETED", "VOIDED")).toBe(false);
  });

  it("blocks skipping send and going backwards", () => {
    expect(canTransitionSignStatus("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransitionSignStatus("DRAFT", "PARTIALLY_SIGNED")).toBe(false);
    expect(canTransitionSignStatus("PARTIALLY_SIGNED", "SENT")).toBe(false);
  });

  it("has no outbound transitions from terminal states", () => {
    for (const terminal of ["COMPLETED", "VOIDED", "DECLINED", "EXPIRED"] as const) {
      expect(SIGN_STATUS_TRANSITIONS[terminal]).toEqual([]);
    }
  });
});
