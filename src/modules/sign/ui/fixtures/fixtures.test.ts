import { describe, expect, it } from "vitest";
import { PLANS } from "@/platform/billing/plans";
import { SIGN_DOCUMENT_STATUSES } from "@/platform/db/sign-status";
import { planSummaryFrom } from "../screens/plan-summary";
import { parseDocumentsSearch } from "../screens/documents-search";
import { findDocumentDetail } from "./details";
import { DOCUMENT_FIXTURES, listDocuments, manyDocuments } from "./documents";
import { PLAN_FIXTURES } from "./plans";
import { BILLING_STATES, DASHBOARD_STATES, DOCUMENTS_LIST_STATES } from "./screens";

describe("fixtures cover the edge cases", () => {
  it("every document status, 1 and 10 signers, sequential and parallel, long text", () => {
    expect(new Set(DOCUMENT_FIXTURES.map((d) => d.status))).toEqual(new Set(SIGN_DOCUMENT_STATUSES));
    const counts = DOCUMENT_FIXTURES.map((d) => d.signerCount);
    expect(counts).toContain(1);
    expect(counts).toContain(10);
    expect(new Set(DOCUMENT_FIXTURES.map((d) => d.signingOrder))).toEqual(new Set(["sequential", "parallel"]));
    expect(Math.max(...DOCUMENT_FIXTURES.map((d) => d.title.length))).toBeGreaterThan(100);
    expect(Math.max(...DOCUMENT_FIXTURES.flatMap((d) => d.signers.map((s) => s.email.length)))).toBeGreaterThan(60);
  });

  it("free, credits and Pro plans", () => {
    expect(new Set(Object.values(PLAN_FIXTURES).map((p) => p.kind))).toEqual(new Set(["free", "credits", "pro"]));
    expect(DASHBOARD_STATES.some((s) => s.vm.isFirstTime)).toBe(true);
    expect(DOCUMENTS_LIST_STATES.map((s) => s.id)).toEqual(expect.arrayContaining(["empty", "one", "many", "no-results"]));
  });

  it("plan fixtures match plans.ts limits", () => {
    for (const plan of Object.values(PLAN_FIXTURES)) {
      expect(plan.freeLimit).toBe(PLANS.free.freeSendsPerCalendarMonth);
      expect(plan.freeMaxSigners).toBe(PLANS.free.maxSigners);
      expect(plan.maxSigners).toBe(plan.kind === "free" ? PLANS.free.maxSigners : PLANS.sign_pro_monthly.maxSigners);
    }
  });

  it("every fixture document has a consistent detail page", () => {
    for (const doc of [...DOCUMENT_FIXTURES, ...manyDocuments(25)]) {
      const detail = findDocumentDetail(doc.id)!;
      expect(detail.signers).toHaveLength(doc.signerCount);
      const signed = detail.signers.filter((s) => s.status === "SIGNED").length;
      if (doc.status === "COMPLETED") expect(signed).toBe(doc.signerCount);
      if (doc.status === "PARTIALLY_SIGNED") expect(signed).toBe(doc.signedCount);
      expect(detail.activity.length).toBeGreaterThan(0);
    }
    expect(findDocumentDetail("nope")).toBeNull();
  });

  it("billing prices come from plans.ts", () => {
    const { creditPacks, subscriptions } = BILLING_STATES[0].vm;
    expect(creditPacks.map((p) => [p.price, p.credits])).toEqual([
      ["$10", 10],
      ["$25", 30],
    ]);
    expect(subscriptions.map((s) => [s.monthly.price, s.yearly.price, s.yearly.savingsMonths])).toEqual([
      ["$15", "$150", 2],
      ["$29", "$290", 2],
    ]);
    expect(BILLING_STATES.find((s) => s.id === "pro")!.vm.subscriptions[0].current).toBe(true);
  });
});

describe("listDocuments (fixture stand-in for the owner query)", () => {
  const all = [...DOCUMENT_FIXTURES, ...manyDocuments(25)];

  it("filters by status group and searches title or signer email", () => {
    expect(listDocuments(all, { filter: "closed" }).rows.every((d) => ["DECLINED", "EXPIRED", "VOIDED"].includes(d.status))).toBe(true);
    const byEmail = listDocuments(all, { filter: "all", query: "NORTHWIND" });
    expect(byEmail.rows.length).toBeGreaterThan(0);
    expect(byEmail.rows.every((d) => d.signers.some((s) => s.email.includes("northwind")))).toBe(true);
    expect(listDocuments(all, { filter: "all", query: "investor" }).rows.map((d) => d.id)).toEqual(["doc_completed"]);
  });

  it("narrows Completed to this month", () => {
    const rows = listDocuments(all, { filter: "completed", period: "month" }).rows;
    expect(rows.map((d) => d.id)).toEqual(["doc_completed"]);
  });

  it("paginates with cursors in both directions", () => {
    const page1 = listDocuments(all, { filter: "all" });
    expect(page1.rows).toHaveLength(10);
    expect(page1.page.prevCursor).toBeNull();
    const page2 = listDocuments(all, { filter: "all", cursor: page1.page.nextCursor });
    expect(page2.rows[0].id).toBe(page1.page.nextCursor);
    expect(page2.page.prevCursor).toBe(page1.rows[0].id);
    expect(listDocuments(all, { filter: "all", cursor: "unknown" }).rows[0].id).toBe(page1.rows[0].id);
  });

  it("knows the difference between no documents and no matches", () => {
    expect(listDocuments([], { filter: "all" }).hasAnyDocuments).toBe(false);
    expect(listDocuments(all, { filter: "all", query: "zzz" })).toMatchObject({ hasAnyDocuments: true, rows: [] });
  });
});

describe("parseDocumentsSearch", () => {
  it("accepts valid params and falls back on anything else", () => {
    expect(parseDocumentsSearch({ status: "completed", period: "month", q: " acme ", cursor: "doc_1" })).toEqual({
      status: "completed",
      period: "month",
      q: "acme",
      cursor: "doc_1",
    });
    expect(parseDocumentsSearch({ status: "DROP TABLE", period: "year", q: "x".repeat(500), cursor: "../../etc" })).toEqual({
      status: "all",
      period: null,
      q: "",
      cursor: null,
    });
    expect(parseDocumentsSearch({ status: ["waiting", "draft"] }).status).toBe("waiting");
  });
});

describe("planSummaryFrom (real profile → plan view model)", () => {
  it("free, credits and subscription customers", () => {
    expect(planSummaryFrom({ creditsBalance: 0, subscriptions: [] }, { freeUsed: 2 })).toMatchObject({
      kind: "free",
      planName: "Free",
      subscriptionName: null,
      maxSigners: 2,
      freeUsed: 2,
      freeLimit: 3,
      renewsAt: null,
    });
    expect(planSummaryFrom({ creditsBalance: 7, subscriptions: [] }, { freeUsed: 9 })).toMatchObject({
      kind: "credits",
      maxSigners: 10,
      freeUsed: 3,
    });
    expect(
      planSummaryFrom(
        {
          creditsBalance: 0,
          subscriptions: [{ product: "SIGN_PRO", interval: "YEAR", status: "ACTIVE", currentPeriodEnd: "2027-01-01T00:00:00.000Z" }],
        },
        { freeUsed: 0 }
      )
    ).toMatchObject({
      kind: "pro",
      planName: "Sign Pro (Yearly)",
      subscriptionName: "Sign Pro",
      maxSigners: 10,
      renewsAt: "2027-01-01T00:00:00.000Z",
    });
    expect(
      planSummaryFrom(
        {
          creditsBalance: 3,
          subscriptions: [
            { product: "SIGN_PRO", interval: "MONTH", status: "ACTIVE", currentPeriodEnd: "2026-11-01T00:00:00.000Z" },
            { product: "ALL_ACCESS", interval: "YEAR", status: "ACTIVE", currentPeriodEnd: "2027-06-01T00:00:00.000Z" },
          ],
        },
        { freeUsed: 0 }
      )
    ).toMatchObject({ kind: "pro", planName: "All Access (Yearly)", subscriptionName: "All Access", renewsAt: "2027-06-01T00:00:00.000Z" });
  });
});
