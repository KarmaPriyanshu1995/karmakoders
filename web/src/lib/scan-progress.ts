/** Derive coarse progress from real scan status + event messages (not invented %). */

export function deriveProgress(
  status: string,
  messages: string[]
): { stage: string; progress: number; label: string } {
  if (status === "done") {
    return { stage: "done", progress: 100, label: "Scan completed" };
  }
  if (status === "failed") {
    return { stage: "failed", progress: 0, label: "Scan failed" };
  }
  if (status === "queued") {
    return { stage: "queued", progress: 0, label: "Queued" };
  }
  const joined = messages.join("\n").toLowerCase();
  if (joined.includes("fuzzing.completed") || joined.includes("active discovery/fuzzing finished")) {
    return { stage: "active", progress: 94, label: "Active discovery & fuzzing" };
  }
  if (
    joined.includes("discovery.started") ||
    joined.includes("discovery.progress") ||
    joined.includes("attack-surface discovery") ||
    joined.includes("fuzzing.started")
  ) {
    return { stage: "discovery", progress: 88, label: "Attack-surface discovery" };
  }
  if (joined.includes("ownership-gated active") || joined.includes("active checks")) {
    return { stage: "active", progress: 92, label: "Ownership-gated active checks" };
  }
  if (joined.includes("ai enrichment") || joined.includes("generating ai")) {
    return { stage: "ai", progress: 98, label: "Generating AI explanations" };
  }
  if (joined.includes("security grade")) {
    return { stage: "finalizing", progress: 95, label: "Finalizing grade" };
  }
  if (joined.includes("passive + secret checks finished")) {
    return { stage: "persisting", progress: 85, label: "Persisting findings" };
  }
  if (joined.includes("running passive") || joined.includes("bundle")) {
    return { stage: "scanning", progress: 55, label: "Running security checks" };
  }
  if (joined.includes("fetching")) {
    return { stage: "discovering", progress: 20, label: "Fetching target" };
  }
  if (status === "running") {
    return { stage: "running", progress: 10, label: "Scan running" };
  }
  return { stage: "unknown", progress: 0, label: status };
}
