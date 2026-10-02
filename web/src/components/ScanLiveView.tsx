"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ScanEvent = {
  id: string;
  message: string;
  createdAt: string;
};

type AiExplanation = {
  summary?: string | null;
  whyItMatters?: string | null;
  technicalExplanation?: string | null;
  recommendedAction?: string | null;
  limitations?: string[];
};

type Finding = {
  id: string;
  severity: string;
  title: string;
  explanation: string | null;
  evidenceText: string | null;
  isNew: boolean;
  category?: string | null;
  confidence?: number | null;
  confidenceReason?: string | null;
  findingType?: string | null;
  scannerSource?: string | null;
  verificationStatus?: string | null;
  fixVerifyStatus?: string | null;
  fixVerifyAt?: string | null;
  fixVerifyNote?: string | null;
  isGated?: boolean;
  checkKind?: string | null;
  aiStatus?: string | null;
  aiExplanation?: AiExplanation | null;
  aiFixPrompt?: string | null;
  aiModel?: string | null;
  aiPromptVersion?: string | null;
  aiUnavailableReason?: string | null;
};

type GradeBreakdown = {
  algorithm_version?: string;
  score?: number;
  counts?: {
    by_severity?: Record<string, number>;
    by_verification?: Record<string, number>;
    categories?: string[];
    finding_count?: number;
  };
  drivers?: Array<{ title?: string; severity?: string; impact?: number }>;
  scope_note?: string;
};

type ScanPayload = {
  id: string;
  status: string;
  primaryUrl: string;
  projectName: string;
  projectId?: string;
  grade?: string | null;
  gradeAlgorithmVersion?: string | null;
  gradeBreakdown?: GradeBreakdown | null;
  gradeUnavailableReason?: string | null;
  ownershipStatus?: string | null;
  ownershipMethod?: string | null;
  ownershipFailureReason?: string | null;
  activeChecksStatus?: string | null;
  activeChecksNote?: string | null;
  attackSurfaceSummary?: {
    urls_discovered?: number;
    pages?: number;
    apis?: number;
    forms?: number;
    parameters?: number;
    js_assets?: number;
    source_maps?: number;
    configs_and_files?: number;
    external_references?: number;
    fetched?: number;
    tested?: number;
    skipped?: number;
  } | null;
  type?: string | null;
  repoFullName?: string | null;
  repoCommitSha?: string | null;
  githubScanStatus?: string | null;
  repoScanSummary?: {
    files_discovered?: number;
    files_scanned?: number;
    files_skipped?: number;
    commit_sha?: string;
    inventory?: {
      manifest_count?: number;
      package_count?: number;
      cve_claims?: boolean;
      note?: string;
    };
    budget_exhausted?: boolean;
    exhaust_reason?: string | null;
  } | null;
  diff?: {
    status?: string;
    newCount?: number;
    fixedCount?: number;
    unresolvedCount?: number;
    regressionCount?: number;
    gradePrevious?: string | null;
    gradeCurrent?: string | null;
  } | null;
  summary?: {
    findingCount: number;
    bySeverity: Record<string, number>;
    byVerification: Record<string, number>;
    categories: string[];
  };
  progress?: { stage: string; progress: number; label: string };
  events: ScanEvent[];
  findings?: Finding[];
  error?: string;
};

const TERMINAL = new Set(["done", "failed"]);

const CATEGORY_LABELS: Record<string, string> = {
  secrets: "Secrets",
  authentication: "Authentication",
  authorization: "Authorization",
  api_security: "API security",
  configuration: "Configuration",
  headers: "Headers",
  tls: "TLS",
  cors: "CORS",
  exposure: "Exposure",
  dependency: "Dependency",
  injection: "Injection",
  input_validation: "Input validation",
  file_upload: "File upload",
  database: "Database",
  cryptography: "Cryptography",
  business_logic: "Business logic",
  ai_security: "AI security",
  other: "Other",
};

function categoryLabel(category: string | null | undefined): string | null {
  if (!category) return null;
  return CATEGORY_LABELS[category] ?? category;
}

function confidencePercent(confidence: number | null | undefined): string | null {
  if (confidence == null || Number.isNaN(confidence)) return null;
  return `${Math.round(confidence * 100)}%`;
}

function verificationLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    verified: "Verified",
    unverified: "Unverified",
    not_applicable: "Observed",
    candidate: "Candidate",
  };
  return map[status] ?? status;
}

export function ScanLiveView({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"founder" | "developer">("founder");
  const [sseState, setSseState] = useState<"connecting" | "live" | "idle" | "error">("connecting");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("all");
  const [surfaceItems, setSurfaceItems] = useState<
    Array<{
      id: string;
      url: string;
      method: string;
      endpointType: string;
      statusCode: number | null;
      source: string;
      testStatus: string;
      fetched: boolean;
      tested: boolean;
      isGated: boolean;
    }>
  >([]);
  const [surfaceLoaded, setSurfaceLoaded] = useState(false);
  const [ownershipBusy, setOwnershipBusy] = useState(false);
  const [ownershipMsg, setOwnershipMsg] = useState<string | null>(null);
  const [verifyFixBusy, setVerifyFixBusy] = useState<string | null>(null);
  const [verifyFixMsg, setVerifyFixMsg] = useState<string | null>(null);
  const [ownershipInstructions, setOwnershipInstructions] = useState<{
    summary?: string;
    steps?: string[];
    httpPath?: string | null;
    httpBody?: string | null;
    txtRecord?: string | null;
    method?: string;
  } | null>(null);
  const lastEventId = useRef<string | null>(null);

  async function loadScan() {
    const response = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
    const data = (await response.json()) as ScanPayload;
    if (!response.ok) {
      throw new Error(data.error ?? "Could not load the scan.");
    }
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    async function bootstrap() {
      try {
        const data = await loadScan();
        if (cancelled) return;
        setScan(data);
        setError(null);
        if (TERMINAL.has(data.status)) {
          setSseState("idle");
          return;
        }
        // Live progress via SSE; still refresh full payload on terminal / periodically.
        const after = lastEventId.current ? `?after=${lastEventId.current}` : "";
        es = new EventSource(`/api/scans/${scanId}/events${after}`);
        setSseState("connecting");

        es.addEventListener("scan.snapshot", () => {
          if (!cancelled) setSseState("live");
        });
        es.addEventListener("scan.progress", (ev) => {
          if (cancelled) return;
          setSseState("live");
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              eventId?: string;
              message?: string;
              progress?: number;
              stage?: string;
              status?: string;
            };
            if (payload.eventId) lastEventId.current = payload.eventId;
            setScan((prev) => {
              if (!prev) return prev;
              const exists = prev.events.some((e) => e.id === payload.eventId);
              const events = exists
                ? prev.events
                : [
                    ...prev.events,
                    {
                      id: payload.eventId || String(Date.now()),
                      message: payload.message || "",
                      createdAt: new Date().toISOString(),
                    },
                  ];
              return {
                ...prev,
                status: payload.status || prev.status,
                events,
                progress: {
                  stage: payload.stage || prev.progress?.stage || "running",
                  progress: Math.max(0, Math.min(100, payload.progress ?? prev.progress?.progress ?? 0)),
                  label: payload.message || prev.progress?.label || "Scanning",
                },
              };
            });
          } catch {
            /* ignore malformed event */
          }
        });
        es.addEventListener("scan.terminal", async () => {
          if (cancelled) return;
          es?.close();
          setSseState("idle");
          try {
            const finalData = await loadScan();
            if (!cancelled) setScan(finalData);
          } catch (err) {
            if (!cancelled) setError(err instanceof Error ? err.message : "Could not load final scan.");
          }
        });
        es.onerror = () => {
          if (cancelled) return;
          setSseState("error");
          // Fallback poll — do not restart the scan.
          void loadScan()
            .then((data) => {
              if (cancelled) return;
              setScan(data);
              if (TERMINAL.has(data.status)) {
                es?.close();
                setSseState("idle");
              } else {
                pollTimer = setTimeout(() => {
                  void loadScan().then((d) => {
                    if (!cancelled) setScan(d);
                  });
                }, 3000);
              }
            })
            .catch(() => {
              /* keep last good state */
            });
        };
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not reach the server.");
          pollTimer = setTimeout(() => {
            void bootstrap();
          }, 2000);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [scanId]);

  // After scan completes, keep refreshing briefly while AI artifacts generate.
  useEffect(() => {
    if (!scan || scan.status !== "done") return;
    const stillGenerating = (scan.findings ?? []).some((f) => f.aiStatus === "generating");
    const started = scan.events.some((e) => /generating ai explanations/i.test(e.message));
    const finished = scan.events.some((e) =>
      /ai enrichment finished|ai explanations unavailable/i.test(e.message)
    );
    if (!stillGenerating && (!started || finished)) return;

    const timer = setTimeout(() => {
      void loadScan()
        .then((data) => setScan(data))
        .catch(() => {
          /* keep last */
        });
    }, 2500);
    return () => clearTimeout(timer);
  }, [scan]);

  useEffect(() => {
    if (!scan || scan.status !== "done") return;
    if (scan.activeChecksStatus === "skipped_unverified") return;
    let cancelled = false;
    async function loadSurface() {
      try {
        const q =
          surfaceFilter === "all" ? "" : `?type=${encodeURIComponent(surfaceFilter)}`;
        const res = await fetch(`/api/scans/${scanId}/attack-surface${q}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setSurfaceItems(data.items ?? []);
        setSurfaceLoaded(true);
      } catch {
        if (!cancelled) setSurfaceLoaded(true);
      }
    }
    void loadSurface();
    return () => {
      cancelled = true;
    };
  }, [scan?.status, scan?.activeChecksStatus, scanId, surfaceFilter]);

  async function verifyFix(findingId: string) {
    setVerifyFixBusy(findingId);
    setVerifyFixMsg(null);
    try {
      const res = await fetch(`/api/findings/${findingId}/verify-fix`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        result?: string;
        note?: string;
      };
      if (!res.ok) {
        setVerifyFixMsg(data.error ?? "Verify fix failed.");
        return;
      }
      setVerifyFixMsg(`${data.result}: ${data.note ?? ""}`.trim());
      const refreshed = await loadScan();
      setScan(refreshed);
    } catch (err) {
      setVerifyFixMsg(err instanceof Error ? err.message : "Verify fix failed.");
    } finally {
      setVerifyFixBusy(null);
    }
  }

  async function startOwnershipChallenge(method: "http_file" | "dns_txt") {
    if (!scan?.projectId) {
      setOwnershipMsg("Missing project id — refresh the page.");
      return;
    }
    setOwnershipBusy(true);
    setOwnershipMsg(null);
    try {
      const res = await fetch("/api/ownership/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: scan.projectId, method }),
      });
      const data = (await res.json()) as {
        error?: string;
        instructions?: {
          summary?: string;
          steps?: string[];
          httpPath?: string | null;
          httpBody?: string | null;
          txtRecord?: string | null;
          method?: string;
        };
        status?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not start verification.");
      setOwnershipInstructions(data.instructions ?? null);
      setOwnershipMsg(
        method === "http_file"
          ? "Verification file challenge created. Publish the file, then click Verify."
          : "DNS TXT challenge created. Add the TXT record, then click Verify."
      );
      const refreshed = await loadScan();
      setScan(refreshed);
    } catch (err) {
      setOwnershipMsg(err instanceof Error ? err.message : "Ownership challenge failed.");
    } finally {
      setOwnershipBusy(false);
    }
  }

  async function verifyOwnership() {
    if (!scan?.projectId) return;
    setOwnershipBusy(true);
    setOwnershipMsg(null);
    try {
      const res = await fetch("/api/ownership/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: scan.projectId }),
      });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
        message?: string;
        failureReason?: string;
      };
      if (!res.ok && !data.status) throw new Error(data.error ?? "Verify failed.");
      setOwnershipMsg(data.message ?? `Ownership status: ${data.status}`);
      if (data.failureReason) {
        setOwnershipMsg((prev) => `${prev ?? ""} (${data.failureReason})`.trim());
      }
      const refreshed = await loadScan();
      setScan(refreshed);
    } catch (err) {
      setOwnershipMsg(err instanceof Error ? err.message : "Verify failed.");
    } finally {
      setOwnershipBusy(false);
    }
  }

  if (error && !scan) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-red-700">{error}</p>
        <Link href="/" className="mt-6 inline-block text-sm text-stone-700 underline">
          Back
        </Link>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <p className="text-stone-600">Loading scan…</p>
      </main>
    );
  }

  const findings = scan.findings ?? [];
  const sev = scan.summary?.bySeverity;
  const progressPct = Math.max(0, Math.min(100, scan.progress?.progress ?? 0));
  const showGrade = scan.status === "done" && scan.grade;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-stone-500">Security report</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        {scan.projectName}
      </h1>
      <p className="mt-2 break-all text-stone-600">{scan.primaryUrl}</p>
      <p className="mt-4 text-sm uppercase tracking-wide text-stone-500">
        Status: <span className="font-medium text-stone-900">{scan.status}</span>
        {scan.status !== "done" && scan.status !== "failed" ? (
          <span className="ml-3 normal-case tracking-normal text-stone-500">
            · Live: {sseState} · {scan.progress?.label ?? "…"} ({progressPct}%)
          </span>
        ) : null}
      </p>

      {!TERMINAL.has(scan.status) ? (
        <div className="mt-4 h-2 w-full overflow-hidden rounded bg-stone-200" aria-label="Scan progress">
          <div
            className="h-full bg-stone-800 transition-all"
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      ) : null}

      {scan.status === "failed" ? (
        <div className="mt-8 rounded border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">Scan failed</p>
          <p className="mt-1 text-sm">
            {scan.gradeUnavailableReason ??
              "The scan did not complete, so a complete security grade is unavailable."}
          </p>
        </div>
      ) : null}

      {showGrade ? (
        <section className="mt-10 border-b border-stone-200 pb-8">
          <p className="text-sm uppercase tracking-wide text-stone-500">Security grade</p>
          <p className="mt-2 text-6xl font-semibold tracking-tight text-stone-900">{scan.grade}</p>
          <p className="mt-2 text-sm text-stone-500">
            Algorithm {scan.gradeAlgorithmVersion}
            {typeof scan.gradeBreakdown?.score === "number"
              ? ` · weighted score ${scan.gradeBreakdown.score}`
              : null}
          </p>
          <p className="mt-4 text-stone-700">
            {scan.gradeBreakdown?.scope_note ??
              "Based on the checks performed — not a guarantee of security."}
          </p>
          {sev ? (
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-stone-700 sm:grid-cols-5">
              {(["critical", "high", "medium", "low", "info"] as const).map((k) => (
                <li key={k}>
                  <span className="font-medium capitalize">{k}</span>: {sev[k] ?? 0}
                </li>
              ))}
            </ul>
          ) : null}
          {scan.summary?.categories?.length ? (
            <p className="mt-3 text-sm text-stone-600">
              Categories: {scan.summary.categories.map((c) => categoryLabel(c) ?? c).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {scan.status === "done" && !showGrade ? (
        <p className="mt-8 text-sm text-stone-600">{scan.gradeUnavailableReason}</p>
      ) : null}

      {scan.status === "done" && scan.diff ? (
        <section className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Since last scan
          </p>
          <p className="mt-2 text-sm text-stone-700">
            New: {scan.diff.newCount ?? 0} · Fixed: {scan.diff.fixedCount ?? 0} · Still open:{" "}
            {scan.diff.unresolvedCount ?? 0} · Regressions: {scan.diff.regressionCount ?? 0}
          </p>
          {scan.diff.gradePrevious || scan.diff.gradeCurrent ? (
            <p className="mt-1 text-sm text-stone-600">
              Grade: {scan.diff.gradePrevious ?? "—"} → {scan.diff.gradeCurrent ?? scan.grade ?? "—"}
            </p>
          ) : null}
          {(scan.diff.regressionCount ?? 0) > 0 ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              One or more previously fixed issues came back (regression).
            </p>
          ) : null}
          {scan.diff.status === "skipped_no_baseline" ? (
            <p className="mt-2 text-xs text-stone-500">First completed scan for this target — no baseline yet.</p>
          ) : null}
        </section>
      ) : null}

      <div className="mt-8 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "founder" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => setMode("founder")}
        >
          Founder mode
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            mode === "developer" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => setMode("developer")}
        >
          Developer mode
        </button>
      </div>

      <section className="mt-8 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Domain ownership
        </p>
        {mode === "founder" ? (
          <p className="mt-2 text-sm text-stone-700">
            Prove you own this site to unlock deeper active checks. Passive findings above do not
            require ownership and remain valid either way.
          </p>
        ) : (
          <p className="mt-2 text-xs text-stone-600">
            status={scan.ownershipStatus ?? "unverified"} · method={scan.ownershipMethod ?? "—"} ·
            active={scan.activeChecksStatus ?? "—"}
            {scan.ownershipFailureReason ? ` · failure=${scan.ownershipFailureReason}` : ""}
          </p>
        )}
        <p className="mt-2 text-sm font-medium text-stone-800">
          Ownership:{" "}
          <span className="capitalize">{scan.ownershipStatus ?? "unverified"}</span>
          {scan.activeChecksStatus ? (
            <span className="ml-2 text-xs font-normal text-stone-500">
              · Active checks: {scan.activeChecksStatus}
            </span>
          ) : null}
        </p>
        {scan.activeChecksNote ? (
          <p className="mt-1 text-xs text-stone-600">{scan.activeChecksNote}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={ownershipBusy || !scan.projectId}
            className="rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            onClick={() => void startOwnershipChallenge("http_file")}
          >
            Verify via file
          </button>
          <button
            type="button"
            disabled={ownershipBusy || !scan.projectId}
            className="rounded bg-stone-200 px-3 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-50"
            onClick={() => void startOwnershipChallenge("dns_txt")}
          >
            Verify via DNS TXT
          </button>
          <button
            type="button"
            disabled={ownershipBusy || !scan.projectId}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-50"
            onClick={() => void verifyOwnership()}
          >
            Recheck / Verify
          </button>
        </div>
        {ownershipInstructions ? (
          <div className="mt-3 text-sm text-stone-700">
            <p className="font-medium">{ownershipInstructions.summary}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-stone-600">
              {(ownershipInstructions.steps ?? []).map((step) => (
                <li key={step}>
                  <code className="break-all rounded bg-white px-1">{step}</code>
                </li>
              ))}
            </ol>
            {ownershipInstructions.httpBody ? (
              <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">
                {ownershipInstructions.httpPath}
                {"\n"}
                {ownershipInstructions.httpBody}
              </pre>
            ) : null}
            {ownershipInstructions.txtRecord ? (
              <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-xs">
                {ownershipInstructions.txtRecord}
              </pre>
            ) : null}
          </div>
        ) : null}
        {ownershipMsg ? <p className="mt-2 text-xs text-amber-900">{ownershipMsg}</p> : null}
      </section>

      {scan.type === "repo" ? (
        <section className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Repository scan
          </p>
          <p className="mt-2 text-sm font-medium text-stone-900">
            {scan.repoFullName ?? "Repository"}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            commit={scan.repoCommitSha ?? "—"} · status={scan.githubScanStatus ?? "—"}
          </p>
          {scan.repoScanSummary ? (
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700 sm:grid-cols-4">
              <li>
                <span className="font-medium">
                  {scan.repoScanSummary.files_discovered ?? 0}
                </span>{" "}
                files discovered
              </li>
              <li>
                <span className="font-medium">{scan.repoScanSummary.files_scanned ?? 0}</span>{" "}
                scanned
              </li>
              <li>
                <span className="font-medium">{scan.repoScanSummary.files_skipped ?? 0}</span>{" "}
                skipped
              </li>
              <li>
                <span className="font-medium">
                  {scan.repoScanSummary.inventory?.package_count ?? 0}
                </span>{" "}
                packages inventoried
              </li>
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-stone-500">
            {scan.repoScanSummary?.inventory?.note ??
              "Dependency inventory only — no CVE database consulted."}
            {scan.repoScanSummary?.budget_exhausted
              ? ` Limits stopped the scan early (${scan.repoScanSummary.exhaust_reason}).`
              : ""}
          </p>
        </section>
      ) : null}

      {scan.attackSurfaceSummary && scan.type !== "repo" ? (
        <section className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Attack surface
          </p>
          {mode === "founder" ? (
            <p className="mt-2 text-sm text-stone-700">
              Pages and endpoints we inspected on your verified host (same-origin only).
            </p>
          ) : (
            <p className="mt-2 text-xs text-stone-600">
              Coverage is budget-bounded. Discovered ≠ vulnerable. Active testing requires ownership.
            </p>
          )}
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700 sm:grid-cols-4">
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.urls_discovered ?? 0}</span>{" "}
              URLs discovered
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.apis ?? 0}</span> APIs
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.forms ?? 0}</span> forms
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.parameters ?? 0}</span>{" "}
              parameters
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.js_assets ?? 0}</span> JS
              assets
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.source_maps ?? 0}</span>{" "}
              source maps
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.fetched ?? 0}</span> fetched
            </li>
            <li>
              <span className="font-medium">{scan.attackSurfaceSummary.tested ?? 0}</span> tested
            </li>
          </ul>
          <p className="mt-3 text-xs text-stone-500">
            Discovered {scan.attackSurfaceSummary.urls_discovered ?? 0} same-origin URLs; fetched{" "}
            {scan.attackSurfaceSummary.fetched ?? 0}; actively tested{" "}
            {scan.attackSurfaceSummary.tested ?? 0}
            {(scan.attackSurfaceSummary.skipped ?? 0) > 0
              ? `; skipped ${scan.attackSurfaceSummary.skipped} (limits/policy)`
              : ""}
            .
            {(scan.attackSurfaceSummary.external_references ?? 0) > 0
              ? ` ${scan.attackSurfaceSummary.external_references} external references recorded but not crawled.`
              : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                "all",
                "page",
                "api",
                "form",
                "script",
                "config",
                "authentication",
                "source_map",
              ] as const
            ).map((f) => (
              <button
                key={f}
                type="button"
                className={`rounded px-2 py-1 text-xs ${
                  surfaceFilter === f ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
                }`}
                onClick={() => setSurfaceFilter(f)}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
          {surfaceLoaded && surfaceItems.length > 0 ? (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-xs text-stone-700">
              {surfaceItems.slice(0, 80).map((it) => (
                <li key={it.id} className="flex flex-wrap gap-2 border-b border-stone-100 py-1">
                  <span className="font-mono text-stone-500">{it.method}</span>
                  <span className="break-all">{it.url}</span>
                  <span className="text-stone-400">
                    {it.statusCode ?? "—"} · {it.source} · {it.testStatus}
                    {it.tested ? " · tested" : it.fetched ? " · fetched" : ""}
                    {mode === "developer" ? ` · ${it.endpointType}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : surfaceLoaded ? (
            <p className="mt-3 text-xs text-stone-500">No attack-surface rows for this filter.</p>
          ) : null}
        </section>
      ) : scan.activeChecksStatus === "skipped_unverified" && scan.type !== "repo" ? (
        <section className="mt-8 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Attack surface
          </p>
          <p className="mt-2 text-sm text-stone-700">
            Active discovery is ownership-gated. Verify this domain to unlock crawl, JS endpoint
            discovery, and safe fuzzing.
          </p>
        </section>
      ) : null}

      <ol className="mt-8 space-y-3 border-l border-stone-200 pl-4">
        {scan.events.map((event) => (
          <li key={event.id} className="text-stone-800">
            <p>{event.message}</p>
            <p className="text-xs text-stone-400">
              {new Date(event.createdAt).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ol>

      {findings.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Findings ({findings.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {findings.map((finding) => {
              const open = openId === finding.id;
              const cat = categoryLabel(finding.category);
              const conf = confidencePercent(finding.confidence);
              const ver = verificationLabel(finding.verificationStatus);
              return (
                <li key={finding.id} className="border-b border-stone-200 pb-3">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setOpenId(open ? null : finding.id)}
                  >
                    <span>
                      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {finding.severity}
                      </span>
                      {finding.title}
                      {finding.isNew ? (
                        <span className="ml-2 text-xs text-stone-400">new</span>
                      ) : null}
                      {finding.fixVerifyStatus === "fix_verified" ? (
                        <span className="ml-2 text-xs font-medium text-emerald-700">fix verified</span>
                      ) : null}
                      {finding.isGated ? (
                        <span className="ml-2 text-xs font-medium text-amber-800">active</span>
                      ) : (
                        <span className="ml-2 text-xs text-stone-400">passive</span>
                      )}
                      <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-stone-500">
                        {[cat, conf ? `Confidence: ${conf}` : null, ver ? `Status: ${ver}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-stone-400">{open ? "−" : "+"}</span>
                  </button>
                  {open ? (
                    <div className="mt-3 space-y-4 text-sm text-stone-600">
                      {mode === "founder" ? (
                        <>
                          {finding.aiStatus === "generated" && finding.aiExplanation ? (
                            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                AI-generated explanation
                                {finding.aiPromptVersion
                                  ? ` · prompt ${finding.aiPromptVersion}`
                                  : ""}
                              </p>
                              <p className="mt-2">
                                <span className="font-medium text-stone-800">What we found</span>
                                <br />
                                {finding.aiExplanation.summary ?? finding.explanation ?? finding.title}
                              </p>
                              <p className="mt-2">
                                <span className="font-medium text-stone-800">Why it matters</span>
                                <br />
                                {finding.aiExplanation.whyItMatters ??
                                  "This issue can weaken the security posture of the application."}
                              </p>
                              <p className="mt-2">
                                <span className="font-medium text-stone-800">What you should do</span>
                                <br />
                                {finding.aiExplanation.recommendedAction ??
                                  "Review the evidence and fix the underlying configuration or secret exposure."}
                              </p>
                            </div>
                          ) : (
                            <>
                              <p>
                                <span className="font-medium text-stone-800">What we found</span>
                                <br />
                                {finding.explanation ?? finding.title}
                              </p>
                              <p>
                                <span className="font-medium text-stone-800">Why it matters</span>
                                <br />
                                {finding.explanation ??
                                  "This issue can weaken the security posture of the application."}
                              </p>
                              <p>
                                <span className="font-medium text-stone-800">What you should do</span>
                                <br />
                                Review the evidence below and fix the underlying configuration or
                                secret exposure.
                              </p>
                              {finding.aiUnavailableReason ? (
                                <p className="text-xs text-amber-800">{finding.aiUnavailableReason}</p>
                              ) : finding.aiStatus === "generating" ? (
                                <p className="text-xs text-stone-500">
                                  AI explanation is generating…
                                </p>
                              ) : null}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {finding.explanation ? <p>{finding.explanation}</p> : null}
                          <p className="text-xs text-stone-500">
                            type={finding.findingType ?? "—"} · scanner=
                            {finding.scannerSource ?? "—"} · verification=
                            {finding.verificationStatus ?? "—"}
                          </p>
                          {finding.confidenceReason ? (
                            <p className="text-xs text-stone-500">
                              Why this confidence: {finding.confidenceReason}
                            </p>
                          ) : null}
                          {finding.aiStatus === "generated" && finding.aiExplanation ? (
                            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                AI-generated explanation
                                {finding.aiModel ? ` · ${finding.aiModel}` : ""}
                              </p>
                              {finding.aiExplanation.technicalExplanation ? (
                                <p className="mt-2">
                                  <span className="font-medium text-stone-800">
                                    Technical explanation
                                  </span>
                                  <br />
                                  {finding.aiExplanation.technicalExplanation}
                                </p>
                              ) : null}
                              {finding.aiExplanation.recommendedAction ? (
                                <p className="mt-2">
                                  <span className="font-medium text-stone-800">
                                    Recommended remediation
                                  </span>
                                  <br />
                                  {finding.aiExplanation.recommendedAction}
                                </p>
                              ) : null}
                              {finding.aiExplanation.limitations &&
                              finding.aiExplanation.limitations.length > 0 ? (
                                <p className="mt-2 text-xs text-stone-500">
                                  Limitations: {finding.aiExplanation.limitations.join(" · ")}
                                </p>
                              ) : null}
                              {finding.aiFixPrompt ? (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                                      AI fix prompt
                                    </span>
                                    <button
                                      type="button"
                                      className="rounded bg-stone-900 px-2 py-1 text-xs font-medium text-white"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(
                                          finding.aiFixPrompt ?? ""
                                        );
                                      }}
                                    >
                                      Copy
                                    </button>
                                  </div>
                                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-stone-800">
                                    {finding.aiFixPrompt}
                                  </pre>
                                </div>
                              ) : null}
                            </div>
                          ) : finding.aiUnavailableReason ? (
                            <p className="text-xs text-amber-800">{finding.aiUnavailableReason}</p>
                          ) : finding.aiStatus === "generating" ? (
                            <p className="text-xs text-stone-500">
                              AI explanation is generating…
                            </p>
                          ) : null}
                        </>
                      )}
                      {finding.evidenceText ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                            Scanner evidence
                          </p>
                          <pre className="mt-1 overflow-x-auto rounded bg-stone-100 p-3 text-xs text-stone-800 whitespace-pre-wrap">
                            {finding.evidenceText}
                          </pre>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          disabled={verifyFixBusy === finding.id}
                          onClick={() => void verifyFix(finding.id)}
                        >
                          {verifyFixBusy === finding.id ? "Verifying…" : "Verify Fix"}
                        </button>
                        {finding.fixVerifyStatus ? (
                          <span className="text-xs text-stone-600">
                            Last result: {finding.fixVerifyStatus}
                            {finding.fixVerifyNote ? ` — ${finding.fixVerifyNote}` : ""}
                          </span>
                        ) : null}
                      </div>
                      {verifyFixMsg && openId === finding.id ? (
                        <p className="text-xs text-stone-600">{verifyFixMsg}</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : scan.status === "done" ? (
        <p className="mt-10 text-stone-600">
          No issues were detected by the checks performed. This is not a guarantee of security.
        </p>
      ) : null}

      {scan.status === "queued" ? (
        <p className="mt-8 text-sm text-stone-500">
          Waiting for the Python worker. In another terminal run{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-800">
            python worker.py
          </code>{" "}
          from <code className="rounded bg-stone-100 px-1.5 py-0.5">engine/</code>.
        </p>
      ) : null}

      {TERMINAL.has(scan.status) ? (
        <div className="mt-10 flex gap-4">
          <Link
            href="/"
            className="inline-flex rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
          >
            Scan another URL
          </Link>
        </div>
      ) : null}
    </main>
  );
}
