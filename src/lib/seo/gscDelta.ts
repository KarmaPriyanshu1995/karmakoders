export type GscQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page?: string;
};

export type GscSnapshot = {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  queries: GscQuery[];
};

export type GscDelta = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  rankingDrops: Array<{ query: string; previousPosition: number; currentPosition: number; drop: number }>;
  cannibalization: Array<{ query: string; pages: string[] }>;
  lowCtr: Array<{ query: string; ctr: number; impressions: number }>;
  source: "google" | "manual" | "unchanged";
};

export type GscDeltaPayload = {
  previous: GscSnapshot | null;
  current: GscSnapshot;
  delta: GscDelta;
};

export function emptyGscSnapshot(): GscSnapshot {
  return {
    totalClicks: 0,
    totalImpressions: 0,
    avgCtr: 0,
    avgPosition: 0,
    queries: [],
  };
}

export function snapshotFromRecord(record: {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQueriesJson: string | null;
}): GscSnapshot {
  let queries: GscQuery[] = [];
  if (record.topQueriesJson) {
    try {
      const parsed = JSON.parse(record.topQueriesJson) as unknown;
      if (Array.isArray(parsed)) {
        queries = parsed.map((row) => {
          const item = (row ?? {}) as Record<string, unknown>;
          return {
            query: String(item.query || ""),
            clicks: Number(item.clicks) || 0,
            impressions: Number(item.impressions) || 0,
            ctr: Number(item.ctr) || 0,
            position: Number(item.position) || 0,
            page: typeof item.page === "string" ? item.page : undefined,
          };
        }).filter((q) => q.query);
      }
    } catch {
      queries = [];
    }
  }
  return {
    totalClicks: record.totalClicks,
    totalImpressions: record.totalImpressions,
    avgCtr: record.avgCtr,
    avgPosition: record.avgPosition,
    queries,
  };
}

export function parseGscDeltaPayload(json: string | null | undefined): GscDeltaPayload | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as GscDeltaPayload;
    if (!parsed?.current || !parsed?.delta) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function computeGscDelta(
  previous: GscSnapshot | null,
  current: GscSnapshot,
  source: GscDelta["source"] = "manual"
): GscDelta {
  const prev = previous ?? emptyGscSnapshot();
  const prevByQuery = new Map(prev.queries.map((q) => [q.query.toLowerCase(), q]));
  const rankingDrops: GscDelta["rankingDrops"] = [];

  for (const query of current.queries) {
    const before = prevByQuery.get(query.query.toLowerCase());
    if (!before) continue;
    const drop = query.position - before.position;
    if (drop >= 3) {
      rankingDrops.push({
        query: query.query,
        previousPosition: before.position,
        currentPosition: query.position,
        drop: Number(drop.toFixed(1)),
      });
    }
  }

  const byQueryPages = new Map<string, Set<string>>();
  for (const query of current.queries) {
    if (!query.page) continue;
    const key = query.query.toLowerCase();
    const pages = byQueryPages.get(key) ?? new Set<string>();
    pages.add(query.page);
    byQueryPages.set(key, pages);
  }
  const cannibalization = [...byQueryPages.entries()]
    .filter(([, pages]) => pages.size > 1)
    .map(([query, pages]) => ({ query, pages: [...pages] }));

  const lowCtr = current.queries
    .filter((q) => q.impressions >= 50 && q.ctr < 0.05)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((q) => ({ query: q.query, ctr: q.ctr, impressions: q.impressions }));

  return {
    clicks: current.totalClicks - prev.totalClicks,
    impressions: current.totalImpressions - prev.totalImpressions,
    ctr: Number((current.avgCtr - prev.avgCtr).toFixed(4)),
    position: Number((current.avgPosition - prev.avgPosition).toFixed(2)),
    rankingDrops: rankingDrops.sort((a, b) => b.drop - a.drop).slice(0, 20),
    cannibalization,
    lowCtr,
    source,
  };
}

export function buildGscDeltaPayload(
  previous: GscSnapshot | null,
  current: GscSnapshot,
  source: GscDelta["source"]
): GscDeltaPayload {
  return {
    previous,
    current,
    delta: computeGscDelta(previous, current, source),
  };
}

export function hasGoogleGscCredentials(): boolean {
  return Boolean(
    process.env.GSC_ACCESS_TOKEN ||
      process.env.GOOGLE_GSC_CREDENTIALS ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}
