export type ProjectMetric = { label: string; value: string };

export type ProjectDetails = {
  industry?: string;
  country?: string;
  timeline?: string;
  teamSize?: string;
  challenge?: string;
  results?: string;
  testimonial?: string;
  liveUrl?: string;
  metrics: ProjectMetric[];
};

const EMPTY: ProjectDetails = { metrics: [] };

export function parseProjectDetails(raw: unknown): ProjectDetails {
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  if (!value || typeof value !== "object") return { ...EMPTY, metrics: [] };
  const obj = value as Record<string, unknown>;
  return {
    industry: str(obj.industry),
    country: str(obj.country),
    timeline: str(obj.timeline),
    teamSize: str(obj.teamSize),
    challenge: str(obj.challenge),
    results: str(obj.results),
    testimonial: str(obj.testimonial),
    liveUrl: str(obj.liveUrl),
    metrics: Array.isArray(obj.metrics)
      ? obj.metrics
          .map((row) => {
            const item = (row ?? {}) as Record<string, unknown>;
            const label = str(item.label);
            const metricValue = str(item.value);
            return label && metricValue ? { label, value: metricValue } : null;
          })
          .filter((row): row is ProjectMetric => row !== null)
      : [],
  };
}

export function stringifyProjectDetails(details: ProjectDetails): string | null {
  const compact: Record<string, unknown> = {};
  if (details.industry) compact.industry = details.industry;
  if (details.country) compact.country = details.country;
  if (details.timeline) compact.timeline = details.timeline;
  if (details.teamSize) compact.teamSize = details.teamSize;
  if (details.challenge) compact.challenge = details.challenge;
  if (details.results) compact.results = details.results;
  if (details.testimonial) compact.testimonial = details.testimonial;
  if (details.liveUrl) compact.liveUrl = details.liveUrl;
  if (details.metrics.length) compact.metrics = details.metrics;
  return Object.keys(compact).length ? JSON.stringify(compact) : null;
}

export function metricsFromText(raw: string): ProjectMetric[] {
  return raw
    .split("\n")
    .map((line) => {
      const [label, ...rest] = line.split("|");
      const value = rest.join("|").trim();
      if (!label?.trim() || !value) return null;
      return { label: label.trim(), value };
    })
    .filter((row): row is ProjectMetric => row !== null);
}

export function metricsToText(metrics: ProjectMetric[]): string {
  return metrics.map((row) => `${row.label}|${row.value}`).join("\n");
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
