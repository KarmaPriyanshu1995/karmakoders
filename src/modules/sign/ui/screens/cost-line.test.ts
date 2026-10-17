import { describe, expect, it } from "vitest";
import { PLAN_CREDITS, PLAN_FREE_AT_LIMIT, PLAN_FREE_NEW, PLAN_FREE_TWO_USED, PLAN_PRO } from "../fixtures/plans";
import { costLineFor, costLineText } from "./cost-line";

describe("costLineFor (entitlement order: free → subscription → credits → payment)", () => {
  it("uses a free document while some are left and signers fit the free limit", () => {
    expect(costLineFor(PLAN_FREE_NEW, 2)).toEqual({ kind: "free", nth: 1, limit: 3 });
    expect(costLineText(costLineFor(PLAN_FREE_TWO_USED, 1))).toBe("Free document 3 of 3 this month");
  });

  it("is included in Sign Pro once free documents are used", () => {
    expect(costLineText(costLineFor(PLAN_PRO, 10))).toBe("Included in Sign Pro");
  });

  it("uses 1 credit for a credits customer", () => {
    expect(costLineFor(PLAN_CREDITS, 5)).toEqual({ kind: "credit", balanceAfter: 11 });
    expect(costLineText(costLineFor(PLAN_CREDITS, 5))).toBe("Uses 1 credit");
  });

  it("asks for payment when out of free documents with no credits or subscription", () => {
    const cost = costLineFor(PLAN_FREE_AT_LIMIT, 1);
    expect(cost).toMatchObject({ kind: "payment_required", reason: "out_of_free" });
    expect(costLineText(cost)).toBe("You're out of free documents");
  });

  it("asks for payment when a free document has more signers than allowed", () => {
    const cost = costLineFor(PLAN_FREE_NEW, 3);
    expect(cost).toMatchObject({ kind: "payment_required", reason: "too_many_signers" });
    expect(costLineText(cost)).toBe("Free documents allow up to 2 signers");
  });

  it("skips the free allowance for more than 2 signers when Pro or credits cover it", () => {
    expect(costLineFor({ ...PLAN_PRO, freeUsed: 0 }, 3).kind).toBe("pro");
    expect(costLineFor({ ...PLAN_CREDITS, freeUsed: 0 }, 3).kind).toBe("credit");
  });
});
