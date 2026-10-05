"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ScannerShell } from "@/components/scanner/ScannerShell";
import { IconSpinner } from "@/components/scanner/icons";
import {
  ConfidenceBadge,
  EmptyState,
  GradeCard,
  MethodBadge,
  MetricCard,
  SeverityBadge,
  StatusBadge,
} from "@/components/scanner/ui";

type ScanEvent = { id: string; message: string; createdAt: string };
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
  fixVerifyNote?: string | null;
  isGated?: boolean;
  aiStatus?: string | null;
  aiExplanation?: AiExplanation | null;
  aiFixPrompt?: string | null;
  aiModel?: string | null;
  aiPromptVersion?: string | null;
  aiUnavailableReason?: string | null;
};
type ScanPayload = {
  id: string;
  status: string;
  primaryUrl: string;
  projectName: string;
  projectId?: string;
  grade?: string | null;
  gradeAlgorithmVersion?: string | null;
  gradeBreakdown?: {
    algorithm_version?: string;
    score?: number;
    scope_note?: string;
  } | null;
  gradeUnavailableReason?: string | null;
  ownershipStatus?: string | null;
  ownershipMethod?: string | null;
  ownershipFailureReason?: string | null;
  activeChecksStatus?: string | null;
  activeChecksNote?: string | null;
  attackSurfaceSummary?: Record<string, number | undefined> | null;
  type?: string | null;
  repoFullName?: string | null;
  repoCommitSha?: string | null;
  githubScanStatus?: string | null;
  repoScanSummary?: {
    files_discovered?: number;
    files_scanned?: number;
    files_skipped?: number;
    inventory?: { package_count?: number; note?: string };
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
    categories: string[];
  };
  progress?: { stage: string; progress: number; label: string };
  events: ScanEvent[];
  findings?: Finding[];
  error?: string;
};

type SurfaceItem = {
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
};

type Tab = "overview" | "surface" | "findings" | "activity";

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

function categoryLabel(category: string | null | undefined) {
  if (!category) return null;
  return CATEGORY_LABELS[category] ?? category;
}

function verificationLabel(status: string | null | undefined) {
  if (!status) return null;
  return (
    {
      verified: "Verified",
      unverified: "Unverified",
      not_applicable: "Observed",
      candidate: "Candidate",
    }[status] ?? status
  );
}

function ownershipTone(status: string | null | undefined) {
  const s = (status || "unverified").toLowerCase();
  if (s === "verified") return "success" as const;
  if (s === "failed" || s === "expired" || s === "revoked") return "danger" as const;
  if (s === "pending") return "warning" as const;
  return "neutral" as const;
}

function scanStatusTone(status: string) {
  if (status === "done") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "running" || status === "queued") return "info" as const;
  return "neutral" as const;
}

export function ScanLiveView({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"founder" | "developer">("founder");
  const [tab, setTab] = useState<Tab>("overview");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [surfaceFilter, setSurfaceFilter] = useState("all");
  const [surfaceQuery, setSurfaceQuery] = useState("");
  const [surfaceItems, setSurfaceItems] = useState<SurfaceItem[]>([]);
  const [surfaceLoaded, setSurfaceLoaded] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [sseState, setSseState] = useState<"connecting" | "live" | "idle" | "error">("connecting");
  const [ownershipBusy, setOwnershipBusy] = useState(false);
  const [ownershipMsg, setOwnershipMsg] = useState<string | null>(null);
  const [verifyFixBusy, setVerifyFixBusy] = useState<string | null>(null);
  const [verifyFixMsg, setVerifyFixMsg] = useState<string | null>(null);
  const [ownershipInstructions, setOwnershipInstructions] = useState<{
    method?: string;
    summary?: string;
    steps?: string[];
    httpPath?: string | null;
    httpBody?: string | null;
    txtRecord?: string | null;
    // DNS TXT values come from the API verbatim — never derived or shortened here.
    claimedHost?: string | null;
    verificationHostname?: string | null;
    dnsRecordName?: string | null;
    recordType?: string | null;
    txtValue?: string | null;
    ttl?: string | null;
    cnameNote?: string | null;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [ownershipCheck, setOwnershipCheck] = useState<{
    checkedHostname: string | null;
    failureReason: string | null;
    message: string | null;
    hint: string | null;
  } | null>(null);
  const lastEventId = useRef<string | null>(null);

  async function loadScan() {
    const response = await fetch(`/api/scans/${scanId}`, { cache: "no-store" });
    const data = (await response.json()) as ScanPayload;
    if (!response.ok) throw new Error(data.error ?? "Could not load the scan.");
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
                  progress: payload.progress ?? prev.progress?.progress ?? 0,
                  label: payload.message || prev.progress?.label || "Scanning…",
                },
              };
            });
          } catch {
            /* ignore malformed SSE */
          }
        });
        es.addEventListener("scan.terminal", async () => {
          if (cancelled) return;
          setSseState("idle");
          try {
            const refreshed = await loadScan();
            if (!cancelled) setScan(refreshed);
          } catch {
            /* keep last known */
          }
        });
        es.onerror = () => {
          if (!cancelled) setSseState("error");
        };
        const poll = async () => {
          if (cancelled) return;
          try {
            const refreshed = await loadScan();
            if (cancelled) return;
            setScan(refreshed);
            if (TERMINAL.has(refreshed.status)) {
              setSseState("idle");
              es?.close();
              return;
            }
          } catch {
            /* ignore */
          }
          pollTimer = setTimeout(poll, 4000);
        };
        pollTimer = setTimeout(poll, 4000);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load scan.");
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [scanId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSurface() {
      if (!scan || scan.type === "repo") return;
      if (scan.status !== "done" && scan.activeChecksStatus !== "done" && scan.activeChecksStatus !== "partial") {
        return;
      }
      try {
        const res = await fetch(
          `/api/scans/${scanId}/attack-surface?type=${encodeURIComponent(surfaceFilter)}`,
          { cache: "no-store" }
        );
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
  }, [scan?.status, scan?.activeChecksStatus, scan?.type, scanId, surfaceFilter]);

  async function verifyFix(findingId: string) {
    setVerifyFixBusy(findingId);
    setVerifyFixMsg(null);
    try {
      const res = await fetch(`/api/findings/${findingId}/verify-fix`, { method: "POST" });
      const data = (await res.json()) as { error?: string; result?: string; note?: string };
      if (!res.ok) {
        setVerifyFixMsg(data.error ?? "Verify fix failed.");
        return;
      }
      setVerifyFixMsg(`${data.result}: ${data.note ?? ""}`.trim());
      setScan(await loadScan());
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start verification.");
      setOwnershipInstructions(data.instructions ?? null);
      setOwnershipCheck(null);
      setOwnershipMsg(
        method === "http_file"
          ? "Verification file challenge created. Publish the file, then click Verify."
          : "DNS TXT challenge created. Add the TXT record, then click Verify."
      );
      setScan(await loadScan());
    } catch (err) {
      setOwnershipMsg(err instanceof Error ? err.message : "Ownership challenge failed.");
    } finally {
      setOwnershipBusy(false);
    }
  }

  async function copyExact(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 2000);
    } catch {
      setOwnershipMsg("Copy failed — select the value and copy it manually.");
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
      const data = await res.json();
      if (!res.ok && !data.status) throw new Error(data.error ?? "Verify failed.");
      if (data.status === "failed" && data.method === "dns_txt" && data.instructions) {
        // Show exactly what we checked plus the exact record to add.
        setOwnershipInstructions(data.instructions);
        setOwnershipCheck({
          checkedHostname: data.checkedHostname ?? null,
          failureReason: data.failureReason ?? null,
          message: data.message ?? null,
          hint: data.hint ?? null,
        });
        setOwnershipMsg(null);
      } else {
        setOwnershipCheck(null);
        setOwnershipMsg(data.message ?? `Ownership status: ${data.status}`);
        if (data.failureReason) {
          setOwnershipMsg((prev) => `${prev ?? ""} (${data.failureReason})`.trim());
        }
        if (data.status === "verified") setOwnershipInstructions(null);
      }
      setScan(await loadScan());
    } catch (err) {
      setOwnershipMsg(err instanceof Error ? err.message : "Verify failed.");
    } finally {
      setOwnershipBusy(false);
    }
  }

  const findings = scan?.findings ?? [];
  const filteredFindings = useMemo(() => {
    if (severityFilter === "all") return findings;
    return findings.filter((f) => f.severity.toLowerCase() === severityFilter);
  }, [findings, severityFilter]);

  const filteredSurface = useMemo(() => {
    const q = surfaceQuery.trim().toLowerCase();
    if (!q) return surfaceItems;
    return surfaceItems.filter(
      (item) =>
        item.url.toLowerCase().includes(q) ||
        item.method.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.endpointType.toLowerCase().includes(q)
    );
  }, [surfaceItems, surfaceQuery]);

  const drawerItem = filteredSurface.find((i) => i.id === drawerId) ?? null;
  const sev = scan?.summary?.bySeverity;
  const progressPct = Math.max(0, Math.min(100, scan?.progress?.progress ?? 0));
  const showGrade = scan?.status === "done" && !!scan.grade;
  const targetLabel = scan?.repoFullName || scan?.primaryUrl || "Target";

  if (error && !scan) {
    return (
      <ScannerShell title="Scan unavailable">
        <EmptyState
          title="Could not load this scan"
          body={error}
          action={
            <Link href="/security-scanner" className="scanner-btn-primary">
              Start a new scan
            </Link>
          }
        />
      </ScannerShell>
    );
  }

  if (!scan) {
    return (
      <ScannerShell title="Loading scan">
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="scanner-skeleton h-28 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="scanner-skeleton h-24" />
            <div className="scanner-skeleton h-24" />
            <div className="scanner-skeleton h-24" />
          </div>
        </div>
      </ScannerShell>
    );
  }

  return (
    <ScannerShell
      title={scan.projectName}
      subtitle={targetLabel}
      badge={
        <>
          <StatusBadge label={scan.status} tone={scanStatusTone(scan.status)} />
          <StatusBadge
            label={`Ownership: ${scan.ownershipStatus ?? "unverified"}`}
            tone={ownershipTone(scan.ownershipStatus)}
          />
          {!TERMINAL.has(scan.status) ? (
            <StatusBadge
              label={
                sseState === "error"
                  ? "Live connection interrupted — reconnecting…"
                  : `Live · ${sseState}`
              }
              tone={sseState === "error" ? "warning" : "info"}
            />
          ) : null}
        </>
      }
      actions={
        <Link href="/security-scanner" className="scanner-btn-secondary">
          New scan
        </Link>
      }
    >
      {!TERMINAL.has(scan.status) ? (
        <section className="scanner-card-pad mb-6 animate-fade-up">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="scanner-label">Live scan</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {scan.progress?.label ?? "Scanning…"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Phase: {scan.progress?.stage ?? "running"} · {progressPct}%
              </p>
            </div>
          </div>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scan progress"
          >
            <div
              className="h-full rounded-full bg-scanner-brand transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-sm text-slate-300">
            {scan.events.slice(-8).map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="shrink-0 text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleTimeString("en-US")}
                </span>
                <span>{event.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {scan.status === "failed" ? (
        <section className="mb-6 rounded-[var(--scanner-radius-lg)] border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
          <h2 className="font-semibold">Scan failed</h2>
          <p className="mt-2 text-sm">
            {scan.gradeUnavailableReason ??
              "The scan did not complete, so a complete security grade is unavailable."}
          </p>
          <p className="mt-2 text-sm text-rose-200/80">
            Passive findings already saved remain valid. Start a new scan after fixing connectivity.
          </p>
        </section>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Report sections">
        {(
          [
            ["overview", "Overview"],
            ["findings", `Findings (${findings.length})`],
            ["surface", "Attack surface"],
            ["activity", "Activity"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === id ? "bg-scanner-brand text-scanner-on-brand" : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "founder" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"
            }`}
            onClick={() => setMode("founder")}
          >
            Founder
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "developer" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"
            }`}
            onClick={() => setMode("developer")}
          >
            Developer
          </button>
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            {showGrade ? (
              <GradeCard
                grade={String(scan.grade)}
                reason={
                  scan.gradeBreakdown?.scope_note ??
                  "Based on the checks performed — not a guarantee of security."
                }
                algorithmVersion={scan.gradeAlgorithmVersion}
                animate
              />
            ) : (
              <div className="scanner-card-pad">
                <p className="scanner-label">Security grade</p>
                <p className="mt-3 text-sm text-slate-400">
                  {scan.status === "done"
                    ? scan.gradeUnavailableReason ?? "No grade available for this scan."
                    : "Grade appears after the scan completes."}
                </p>
              </div>
            )}

            <div className="scanner-card-pad">
              <p className="scanner-label">Severity summary</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {(["critical", "high", "medium", "low", "info"] as const).map((k) => {
                  const count = sev?.[k] ?? 0;
                  return (
                    <button
                      key={k}
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                      onClick={() => {
                        setSeverityFilter(k);
                        setTab("findings");
                      }}
                    >
                      <SeverityBadge severity={k} />
                      <p className="mt-2 text-xl font-semibold tabular-nums text-white">{count}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Counts come from this scan’s findings. Click a severity to filter.
              </p>
            </div>
          </div>

          {scan.diff ? (
            <section className="scanner-card-pad">
              <p className="scanner-label">Since last scan</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard label="New" value={scan.diff.newCount ?? 0} />
                <MetricCard label="Fixed" value={scan.diff.fixedCount ?? 0} />
                <MetricCard label="Still open" value={scan.diff.unresolvedCount ?? 0} />
                <MetricCard label="Regressions" value={scan.diff.regressionCount ?? 0} />
              </div>
              {(scan.diff.regressionCount ?? 0) > 0 ? (
                <p className="mt-3 text-sm text-amber-200">
                  One or more previously fixed issues returned (regression).
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="scanner-card-pad">
            <p className="scanner-label">Verify ownership</p>
            <p className="mt-2 text-sm text-slate-300">
              {mode === "founder"
                ? "Deeper security checks require proof that you control this domain. Passive findings do not require ownership."
                : `status=${scan.ownershipStatus ?? "unverified"} · method=${scan.ownershipMethod ?? "—"} · active=${scan.activeChecksStatus ?? "—"}`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge
                label={scan.ownershipStatus ?? "unverified"}
                tone={ownershipTone(scan.ownershipStatus)}
              />
              {scan.activeChecksStatus ? (
                <StatusBadge
                  label={`Active: ${scan.activeChecksStatus}`}
                  tone={
                    scan.activeChecksStatus === "skipped_unverified" ? "warning" : "neutral"
                  }
                />
              ) : null}
            </div>
            {scan.activeChecksNote ? (
              <p className="mt-3 text-xs text-slate-500">{scan.activeChecksNote}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={ownershipBusy || !scan.projectId}
                className="scanner-btn-primary"
                onClick={() => void startOwnershipChallenge("http_file")}
              >
                Verify via file
              </button>
              <button
                type="button"
                disabled={ownershipBusy || !scan.projectId}
                className="scanner-btn-secondary"
                onClick={() => void startOwnershipChallenge("dns_txt")}
              >
                Verify via DNS TXT
              </button>
              <button
                type="button"
                disabled={ownershipBusy || !scan.projectId}
                className="scanner-btn-ghost"
                onClick={() => void verifyOwnership()}
              >
                Recheck / Verify
              </button>
            </div>
            {ownershipInstructions?.method === "dns_txt" && ownershipInstructions.txtValue ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-scanner-bg/50 p-4 text-sm text-slate-300">
                {ownershipCheck ? (
                  <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                    <p className="font-semibold text-amber-200">
                      {ownershipCheck.failureReason === "dns_timeout" ||
                      ownershipCheck.failureReason === "dns_servfail" ||
                      ownershipCheck.failureReason === "dns_resolution_error" ||
                      ownershipCheck.failureReason === "dns_permission_error"
                        ? "DNS lookup did not complete"
                        : ownershipCheck.failureReason === "wrong_token"
                          ? "Verification value does not match"
                          : "Verification record not found"}
                    </p>
                    {ownershipCheck.checkedHostname ? (
                      <p className="mt-1">
                        We checked:{" "}
                        <code className="scanner-mono break-all text-white" data-testid="dns-checked-hostname">
                          {ownershipCheck.checkedHostname}
                        </code>
                      </p>
                    ) : null}
                    {ownershipCheck.message ? <p className="mt-1 text-amber-100/80">{ownershipCheck.message}</p> : null}
                    {ownershipCheck.hint ? (
                      <p className="mt-2 font-medium text-amber-200" data-testid="dns-misplaced-hint">
                        {ownershipCheck.hint}
                      </p>
                    ) : null}
                    <p className="mt-2 text-amber-100/80">
                      Make sure your DNS provider contains the record below, then wait for DNS propagation and try
                      again.
                    </p>
                  </div>
                ) : null}
                <p className="font-medium text-white">Add a DNS TXT record</p>
                <p className="mt-1 text-xs text-slate-400">
                  Create the following DNS record in your domain provider:
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="scanner-mono text-white">{ownershipInstructions.recordType ?? "TXT"}</dd>
                  <dt className="text-slate-500">Name</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <code className="scanner-mono break-all text-white" data-testid="dns-record-name">
                      {ownershipInstructions.dnsRecordName}
                    </code>
                    <button
                      type="button"
                      className="scanner-btn-ghost !px-2 !py-0.5 text-[11px]"
                      onClick={() => void copyExact("name", ownershipInstructions.dnsRecordName ?? "")}
                    >
                      {copiedField === "name" ? "Copied" : "Copy name"}
                    </button>
                  </dd>
                  <dt className="text-slate-500">Value</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    {/* Full token: no truncation, no ellipsis — wraps instead. */}
                    <code className="scanner-mono break-all whitespace-pre-wrap text-white" data-testid="dns-txt-value">
                      {ownershipInstructions.txtValue}
                    </code>
                    <button
                      type="button"
                      className="scanner-btn-ghost !px-2 !py-0.5 text-[11px]"
                      onClick={() => void copyExact("value", ownershipInstructions.txtValue ?? "")}
                    >
                      {copiedField === "value" ? "Copied" : "Copy value"}
                    </button>
                  </dd>
                  <dt className="text-slate-500">TTL</dt>
                  <dd className="text-white">{ownershipInstructions.ttl ?? "1 hour / default"}</dd>
                </dl>
                <p className="mt-3 text-xs text-slate-400">
                  We will look up exactly{" "}
                  <code className="scanner-mono break-all text-slate-200" data-testid="dns-verification-hostname">
                    {ownershipInstructions.verificationHostname}
                  </code>
                  . Some providers want the full name instead of the short one — either form points to the same
                  record.
                </p>
                {ownershipInstructions.cnameNote ? (
                  <p className="mt-2 text-xs text-sky-300">{ownershipInstructions.cnameNote}</p>
                ) : null}
                <button
                  type="button"
                  disabled={ownershipBusy}
                  className="scanner-btn-primary mt-4"
                  onClick={() => void verifyOwnership()}
                >
                  Verify ownership
                </button>
              </div>
            ) : ownershipInstructions ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-scanner-bg/50 p-4 text-sm text-slate-300">
                <p className="font-medium text-white">{ownershipInstructions.summary}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-400">
                  {(ownershipInstructions.steps ?? []).map((step) => (
                    <li key={step}>
                      <code className="scanner-mono break-all">{step}</code>
                    </li>
                  ))}
                </ol>
                {ownershipInstructions.httpBody ? (
                  <pre className="scanner-mono mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
                    {ownershipInstructions.httpPath}
                    {"\n"}
                    {ownershipInstructions.httpBody}
                  </pre>
                ) : null}
              </div>
            ) : null}
            {ownershipMsg ? <p className="mt-3 text-xs text-amber-200">{ownershipMsg}</p> : null}
          </section>

          {scan.type === "repo" && scan.repoScanSummary ? (
            <section className="scanner-card-pad">
              <p className="scanner-label">Repository coverage</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard label="Discovered" value={scan.repoScanSummary.files_discovered ?? 0} />
                <MetricCard label="Scanned" value={scan.repoScanSummary.files_scanned ?? 0} />
                <MetricCard label="Skipped" value={scan.repoScanSummary.files_skipped ?? 0} />
                <MetricCard
                  label="Packages"
                  value={scan.repoScanSummary.inventory?.package_count ?? 0}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {scan.repoScanSummary.inventory?.note ??
                  "Dependency inventory only — no CVE database consulted."}
              </p>
            </section>
          ) : null}

          {scan.attackSurfaceSummary && scan.type !== "repo" ? (
            <section className="scanner-card-pad">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="scanner-label">Attack surface coverage</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Discovered ≠ vulnerable. Active testing requires ownership.
                  </p>
                </div>
                <button type="button" className="scanner-btn-secondary" onClick={() => setTab("surface")}>
                  Open explorer
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard label="Discovered" value={scan.attackSurfaceSummary.urls_discovered ?? 0} />
                <MetricCard label="Fetched" value={scan.attackSurfaceSummary.fetched ?? 0} />
                <MetricCard label="Tested" value={scan.attackSurfaceSummary.tested ?? 0} />
                <MetricCard label="Skipped" value={scan.attackSurfaceSummary.skipped ?? 0} />
                <MetricCard label="APIs" value={scan.attackSurfaceSummary.apis ?? 0} />
                <MetricCard label="Forms" value={scan.attackSurfaceSummary.forms ?? 0} />
                <MetricCard label="Parameters" value={scan.attackSurfaceSummary.parameters ?? 0} />
                <MetricCard label="JS assets" value={scan.attackSurfaceSummary.js_assets ?? 0} />
              </div>
            </section>
          ) : null}

          <section className="scanner-card-pad">
            <p className="scanner-label">Passive vs active</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">Passive</p>
                <p className="mt-2 text-sm text-slate-400">
                  Checks that can run without proving ownership (headers, TLS, CORS, exposure).
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-100">Active</p>
                <p className="mt-2 text-sm text-slate-400">
                  Deeper discovery and safe fuzzing after ownership verification.
                  {scan.activeChecksStatus === "skipped_unverified"
                    ? " Currently skipped — ownership not verified."
                    : ""}
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {tab === "findings" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                severityFilter === "all" ? "bg-scanner-brand text-scanner-on-brand" : "bg-white/5 text-slate-300"
              }`}
              onClick={() => setSeverityFilter("all")}
            >
              All ({findings.length})
            </button>
            {(["critical", "high", "medium", "low", "info"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                  severityFilter === k ? "bg-scanner-brand text-scanner-on-brand" : "bg-white/5 text-slate-300"
                }`}
                onClick={() => setSeverityFilter(k)}
              >
                {k} ({sev?.[k] ?? 0})
              </button>
            ))}
          </div>

          {filteredFindings.length === 0 ? (
            <EmptyState
              title="No security issues matched"
              body={
                findings.length === 0
                  ? "No security issues were verified for this scan. That is not a guarantee of security."
                  : "No findings for this severity filter."
              }
            />
          ) : (
            <ul className="space-y-3">
              {filteredFindings.map((finding) => {
                const open = openId === finding.id;
                return (
                  <li key={finding.id} className="scanner-card overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-white/[0.03]"
                      onClick={() => setOpenId(open ? null : finding.id)}
                      aria-expanded={open}
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={finding.severity} />
                          {finding.isGated ? <StatusBadge label="Active" tone="warning" /> : <StatusBadge label="Passive" />}
                          {finding.isNew ? <StatusBadge label="New" tone="info" /> : null}
                          {finding.fixVerifyStatus === "fix_verified" ? (
                            <StatusBadge label="Fix verified" tone="success" />
                          ) : null}
                        </span>
                        <span className="mt-2 block font-medium text-white">{finding.title}</span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {[
                            categoryLabel(finding.category),
                            verificationLabel(finding.verificationStatus),
                            finding.confidence != null
                              ? `Confidence ${Math.round(finding.confidence * 100)}%`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="text-slate-500" aria-hidden="true">
                        {open ? "−" : "+"}
                      </span>
                    </button>
                    {open ? (
                      <div className="space-y-4 border-t border-white/10 p-4 text-sm text-slate-300">
                        {mode === "founder" ? (
                          <>
                            <p>
                              <span className="font-medium text-white">What we found</span>
                              <br />
                              {finding.aiExplanation?.summary ?? finding.explanation ?? finding.title}
                            </p>
                            <p>
                              <span className="font-medium text-white">Why it matters</span>
                              <br />
                              {finding.aiExplanation?.whyItMatters ??
                                "This issue can weaken the security posture of the application."}
                            </p>
                            <p>
                              <span className="font-medium text-white">What you should do</span>
                              <br />
                              {finding.aiExplanation?.recommendedAction ??
                                "Review the evidence and fix the underlying configuration or secret exposure."}
                            </p>
                          </>
                        ) : (
                          <>
                            {finding.explanation ? <p>{finding.explanation}</p> : null}
                            <p className="scanner-mono text-xs text-slate-500">
                              type={finding.findingType ?? "—"} · scanner={finding.scannerSource ?? "—"} ·
                              verification={finding.verificationStatus ?? "—"}
                            </p>
                            {finding.confidenceReason ? (
                              <p className="text-xs text-slate-500">
                                Why this confidence: {finding.confidenceReason}
                              </p>
                            ) : null}
                            <ConfidenceBadge confidence={finding.confidence} />
                          </>
                        )}

                        {finding.evidenceText ? (
                          <div className="rounded-xl border border-white/10 bg-scanner-bg/60 p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Scanner evidence
                            </p>
                            <pre className="scanner-mono mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                              {finding.evidenceText}
                            </pre>
                          </div>
                        ) : null}

                        {finding.aiStatus === "generated" && finding.aiExplanation ? (
                          <div className="rounded-xl border border-scanner-brand/20 bg-scanner-brand-soft p-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-scanner-brand-label">
                              AI-generated explanation
                              {finding.aiPromptVersion ? ` · prompt ${finding.aiPromptVersion}` : ""}
                              {finding.aiModel ? ` · ${finding.aiModel}` : ""}
                            </p>
                            {finding.aiExplanation.technicalExplanation ? (
                              <p className="mt-2">{finding.aiExplanation.technicalExplanation}</p>
                            ) : null}
                            {finding.aiFixPrompt ? (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  className="scanner-btn-secondary"
                                  onClick={() =>
                                    void navigator.clipboard.writeText(finding.aiFixPrompt ?? "")
                                  }
                                >
                                  Copy AI fix prompt
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : finding.aiUnavailableReason ? (
                          <p className="text-xs text-amber-200">{finding.aiUnavailableReason}</p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="scanner-btn-primary"
                            disabled={verifyFixBusy === finding.id}
                            onClick={() => void verifyFix(finding.id)}
                          >
                            {verifyFixBusy === finding.id ? (
                              <>
                                <IconSpinner className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying…
                              </>
                            ) : (
                              "Verify Fix"
                            )}
                          </button>
                          {finding.fixVerifyStatus ? (
                            <span className="text-xs text-slate-400">
                              Last result: {finding.fixVerifyStatus}
                              {finding.fixVerifyNote ? ` — ${finding.fixVerifyNote}` : ""}
                            </span>
                          ) : null}
                        </div>
                        {verifyFixMsg && openId === finding.id ? (
                          <p className="text-xs text-slate-400">{verifyFixMsg}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "surface" ? (
        <div className="space-y-4">
          {scan.type === "repo" ? (
            <EmptyState
              title="Attack surface explorer is for URL scans"
              body="Repository scans show file coverage on the Overview tab instead."
            />
          ) : scan.activeChecksStatus === "skipped_unverified" ? (
            <EmptyState
              title="Active discovery was skipped"
              body="Verify domain ownership to unlock crawl, JS endpoint discovery, and safe fuzzing."
              action={
                <button type="button" className="scanner-btn-primary" onClick={() => setTab("overview")}>
                  Go to ownership
                </button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="search"
                  value={surfaceQuery}
                  onChange={(e) => setSurfaceQuery(e.target.value)}
                  placeholder="Search paths, endpoints, sources…"
                  className="scanner-input md:max-w-md"
                  aria-label="Search attack surface"
                />
                <div className="flex flex-wrap gap-2">
                  {["all", "page", "api", "form", "asset", "config"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                        surfaceFilter === f
                          ? "bg-scanner-brand text-scanner-on-brand"
                          : "bg-white/5 text-slate-300"
                      }`}
                      onClick={() => setSurfaceFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {!surfaceLoaded ? (
                <div className="scanner-skeleton h-40 w-full" aria-busy="true" />
              ) : filteredSurface.length === 0 ? (
                <EmptyState
                  title="No attack surface items"
                  body="No attack surface discovered yet for this filter."
                />
              ) : (
                <div className="scanner-card overflow-hidden">
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 border-b border-white/10 bg-scanner-bg/90 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold">Method</th>
                          <th className="px-4 py-3 font-semibold">URL</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Via</th>
                          <th className="px-4 py-3 font-semibold">Test</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSurface.map((item) => (
                          <tr
                            key={item.id}
                            className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03]"
                            onClick={() => setDrawerId(item.id)}
                          >
                            <td className="px-4 py-3 capitalize text-slate-300">{item.endpointType}</td>
                            <td className="px-4 py-3">
                              <MethodBadge method={item.method} />
                            </td>
                            <td className="scanner-mono max-w-md truncate px-4 py-3 text-slate-200">
                              {item.url}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-slate-400">
                              {item.statusCode ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-400">{item.source}</td>
                            <td className="px-4 py-3 text-slate-400">{item.testStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="divide-y divide-white/5 md:hidden">
                    {filteredSurface.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="w-full p-4 text-left"
                          onClick={() => setDrawerId(item.id)}
                        >
                          <div className="flex items-center gap-2">
                            <MethodBadge method={item.method} />
                            <span className="text-xs capitalize text-slate-400">{item.endpointType}</span>
                          </div>
                          <p className="scanner-mono mt-2 break-all text-sm text-slate-200">{item.url}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.source} · {item.testStatus}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {drawerItem ? (
            <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
              <button
                type="button"
                className="absolute inset-0 bg-black/60"
                aria-label="Close endpoint details"
                onClick={() => setDrawerId(null)}
              />
              <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-scanner-bg p-5 shadow-scanner">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="scanner-label">Endpoint</p>
                    <div className="mt-2 flex items-center gap-2">
                      <MethodBadge method={drawerItem.method} />
                      <span className="text-xs capitalize text-slate-400">{drawerItem.endpointType}</span>
                    </div>
                  </div>
                  <button type="button" className="scanner-btn-ghost" onClick={() => setDrawerId(null)}>
                    Close
                  </button>
                </div>
                <p className="scanner-mono mt-4 break-all text-sm text-slate-200">{drawerItem.url}</p>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">HTTP status</dt>
                    <dd className="text-slate-200">{drawerItem.statusCode ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Discovered via</dt>
                    <dd className="text-slate-200">{drawerItem.source}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Test status</dt>
                    <dd className="text-slate-200">{drawerItem.testStatus}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Fetched</dt>
                    <dd className="text-slate-200">{drawerItem.fetched ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Tested</dt>
                    <dd className="text-slate-200">{drawerItem.tested ? "Yes" : "No"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Ownership gated</dt>
                    <dd className="text-slate-200">{drawerItem.isGated ? "Yes" : "No"}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "activity" ? (
        <section className="scanner-card-pad">
          <p className="scanner-label">Scan activity</p>
          <p className="mt-2 text-sm text-slate-400">
            Real events from the scanner worker. No invented progress.
          </p>
          <ol className="mt-6 space-y-4 border-l border-white/10 pl-4">
            {scan.events.map((event) => (
              <li key={event.id} className="animate-fade-up">
                <p className="text-sm text-slate-200">{event.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(event.createdAt).toLocaleString("en-US")}
                </p>
              </li>
            ))}
          </ol>
          {scan.events.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No events yet.</p>
          ) : null}
        </section>
      ) : null}
    </ScannerShell>
  );
}
