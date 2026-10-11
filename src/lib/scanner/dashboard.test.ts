import { describe, it, expect } from "vitest";
import { summarizeDashboard, type DashboardInput } from "@/lib/scanner/dashboard";

function base(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return {
    project: { id: "p1", name: "Shop", primary_url: "https://shop.example" },
    scanCount: 0,
    states: [],
    latestFindings: [],
    recentScans: [],
    lastDoneScan: null,
    apiSecurityEvent: null,
    ...overrides,
  };
}

describe("summarizeDashboard", () => {
  it("returns an empty, honest shape when there is no data", () => {
    const d = summarizeDashboard(base());
    expect(d.metrics.totalScans).toBe(0);
    expect(d.grade).toBeNull();
    expect(d.findingsBySeverity).toEqual({ critical: 0, high: 0, medium: 0, low: 0, info: 0 });
    expect(d.apiSecurity.ran).toBe(false);
    expect(d.apiSecurity.endpoints).toBe(0);
  });

  it("tallies open/resolved from lifecycle states and severity from latest findings", () => {
    const d = summarizeDashboard(
      base({
        scanCount: 3,
        states: [
          { state: "open", severity: "critical", category: "api_security" },
          { state: "open", severity: "high", category: "headers" },
          { state: "fixed", severity: "medium", category: "tls" },
        ],
        latestFindings: [
          { severity: "critical", category: "api_security", finding_type: "api_bola", scanner_source: "api_security", verification_status: "verified" },
          { severity: "high", category: "headers", finding_type: "missing_security_header", scanner_source: "engine", verification_status: "not_applicable" },
          { severity: "high", category: "api_security", finding_type: "api_spec_security", scanner_source: "api_security", verification_status: "candidate" },
        ],
        lastDoneScan: { id: "s1", grade: "C", status: "done", finished_at: "2026-01-01T00:00:00Z" },
      })
    );
    expect(d.metrics).toMatchObject({ totalScans: 3, criticalOpen: 1, highOpen: 1, resolved: 1, potentialOpen: 2 });
    expect(d.grade).toBe("C");
    expect(d.findingsBySeverity).toMatchObject({ critical: 1, high: 2 });
    expect(d.findingsByCategory[0]).toEqual({ category: "api_security", count: 2 });
  });

  it("derives API Security from its findings and the scan event, verified separate from confirmed", () => {
    const d = summarizeDashboard(
      base({
        scanCount: 1,
        latestFindings: [
          { severity: "high", category: "api_security", finding_type: "api_bola", scanner_source: "api_security", verification_status: "verified" },
          { severity: "medium", category: "api_security", finding_type: "api_data_exposure", scanner_source: "api_security", verification_status: "candidate" },
          { severity: "low", category: "headers", finding_type: "missing_security_header", scanner_source: "engine", verification_status: "not_applicable" },
        ],
        apiSecurityEvent:
          "api_security.inventory — 12 API endpoint(s), 1 spec URL(s), 0 GraphQL endpoint(s); 2 tested, 10 not tested, 0 out of scope; passive checks: 5 executed, 2 with insufficient evidence; 3 finding(s) saved; 0 spec URL(s) eligible for a later authorized import; active testing: 4 check(s), 9 authorized request(s), 1 confirmed",
      })
    );
    expect(d.apiSecurity.ran).toBe(true);
    expect(d.apiSecurity.endpoints).toBe(12);
    expect(d.apiSecurity.activeRequests).toBe(9);
    expect(d.apiSecurity.confirmed).toBe(1);
    expect(d.apiSecurity.findingCount).toBe(2); // only api_security scanner findings
    expect(d.apiSecurity.verified).toBe(1);
  });

  it("buckets unknown severities as info and ignores null categories", () => {
    const d = summarizeDashboard(
      base({
        scanCount: 1,
        latestFindings: [
          { severity: "weird", category: null, finding_type: "x", scanner_source: "engine", verification_status: null },
        ],
      })
    );
    expect(d.findingsBySeverity.info).toBe(1);
    expect(d.findingsByCategory).toEqual([]);
  });
});
