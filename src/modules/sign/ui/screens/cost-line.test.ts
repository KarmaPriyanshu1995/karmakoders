import { describe, expect, it } from "vitest";
import { PLAN_ALL_ACCESS, PLAN_CREDITS, PLAN_FREE_AT_LIMIT, PLAN_FREE_NEW, PLAN_FREE_TWO_USED, PLAN_PRO } from "../fixtures/plans";
import { costLineFor, costLineText } from "./cost-line";

describe("costLineFor (entitlement order: subscription → free → credits → payment)", () => {
  it("subscribers are always covered by their plan and never use the free allowance", () => {
    for (const signers of [1, 2, 3, 10]) {
      expect(costLineFor(PLAN_PRO, signers)).toEqual({ kind: "pro", subscriptionName: "Sign Pro" });
    }
    expect(costLineText(costLineFor(PLAN_PRO, 1))).toBe("Included in Sign Pro");
    expect(costLineText(costLineFor(PLAN_ALL_ACCESS, 1))).toBe("Included in All Access");
    // Even with free documents left this month, a subscriber's send is "Included".
    expect(PLAN_PRO.freeUsed).toBeLessThan(PLAN_PRO.freeLimit);
  });

  it("uses a free document while some are left and signers fit the free limit", () => {
    expect(costLineFor(PLAN_FREE_NEW, 2)).toEqual({ kind: "free", nth: 1, limit: 3 });
    expect(costLineText(costLineFor(PLAN_FREE_TWO_USED, 1))).toBe("Free document 3 of 3 this month");
  });

  it("uses free documents before credits, then 1 credit", () => {
    expect(costLineFor({ ...PLAN_CREDITS, freeUsed: 0 }, 2).kind).toBe("free");
    expect(costLineFor(PLAN_CREDITS, 5)).toEqual({ kind: "credit", balanceAfter: 11 });
    expect(costLineText(costLineFor(PLAN_CREDITS, 5))).toBe("Uses 1 credit");
    expect(costLineFor({ ...PLAN_CREDITS, freeUsed: 0 }, 3).kind).toBe("credit");
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
});
