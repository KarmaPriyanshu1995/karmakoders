// Pure aggregation for the project Security dashboard. No DB access here so it can be
// unit-tested deterministically; the route (route.ts) does the queries and calls this.

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

export type FindingRow = {
  severity: string | null;
  category: string | null;
  finding_type: string | null;
  scanner_source: string | null;
  verification_status: string | null;
};

export type StateRow = {
  state: string; // 'open' | 'fixed'
  severity: string | null;
  category: string | null;
};

export type ScanRow = {
  id: string;
  type: string | null;
  status: string | null;
  grade: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type DashboardInput = {
  project: { id: string; name: string | null; primary_url: string | null };
  scanCount: number;
  states: StateRow[];
  latestFindings: FindingRow[];
  recentScans: ScanRow[];
  lastDoneScan: { id: string; grade: string | null; status: string | null; finished_at: string | null } | null;
  apiSecurityEvent: string | null; // latest "api_security.*" scan_events message, if any
};

function emptySeverity(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

function tallySeverity(rows: { severity: string | null }[]): Record<Severity, number> {
  const out = emptySeverity();
  for (const r of rows) {
    const s = (r.severity || "info").toLowerCase();
    out[(s in out ? s : "info") as Severity] += 1;
  }
  return out;
}

// Pull "N API endpoint(s)" / "M confirmed" / "K check(s)" out of the api_security event line.
function parseApiEvent(message: string | null): { endpoints: number; activeRequests: number; confirmed: number } {
  const num = (re: RegExp): number => {
    const m = message?.match(re);
    return m ? Number(m[1]) : 0;
  };
  return {
    endpoints: num(/(\d+)\s+API endpoint/),
    activeRequests: num(/(\d+)\s+authorized request/),
    confirmed: num(/(\d+)\s+confirmed/),
  };
}

export function summarizeDashboard(input: DashboardInput) {
  const open = input.states.filter((s) => s.state === "open");
  const fixed = input.states.filter((s) => s.state === "fixed");
  const openBySeverity = tallySeverity(open);
  const findingsBySeverity = tallySeverity(input.latestFindings);

  const categoryCounts = new Map<string, number>();
  for (const f of input.latestFindings) {
    if (!f.category) continue;
    categoryCounts.set(f.category, (categoryCounts.get(f.category) ?? 0) + 1);
  }
  const findingsByCategory = [...categoryCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const potentialOpen = open.length; // open lifecycle findings not yet fixed
  const apiFindings = input.latestFindings.filter((f) => (f.scanner_source || "") === "api_security");
  const apiEvent = parseApiEvent(input.apiSecurityEvent);

  return {
    project: {
      id: input.project.id,
      name: input.project.name ?? "Project",
      primaryUrl: input.project.primary_url ?? "",
    },
    grade: input.lastDoneScan?.grade ?? null,
    metrics: {
      totalScans: input.scanCount,
      criticalOpen: openBySeverity.critical,
      highOpen: openBySeverity.high,
      potentialOpen,
      resolved: fixed.length,
      lastScanStatus: input.lastDoneScan?.status ?? (input.recentScans[0]?.status ?? null),
    },
    findingsBySeverity,
    findingsByCategory,
    recentScans: input.recentScans.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      grade: s.grade,
      startedAt: s.started_at,
      finishedAt: s.finished_at,
    })),
    apiSecurity: {
      endpoints: apiEvent.endpoints,
      activeRequests: apiEvent.activeRequests,
      confirmed: apiEvent.confirmed,
      findingCount: apiFindings.length,
      bySeverity: tallySeverity(apiFindings),
      verified: apiFindings.filter((f) => f.verification_status === "verified").length,
      ran: input.apiSecurityEvent !== null,
    },
  };
}

export type DashboardData = ReturnType<typeof summarizeDashboard>;
