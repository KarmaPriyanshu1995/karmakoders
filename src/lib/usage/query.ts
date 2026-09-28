import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fillDailySeries, type UsageFilters } from "@/lib/usage/series";

export interface UsageDashboard {
  ready: boolean;
  activeNow: number;
  dau: number;
  wau: number;
  mau: number;
  uniqueVisitors: number;
  returningVisitors: number;
  newVisitors: number;
  pageviews: number;
  executes: number;
  errors: number;
  copies: number;
  downloads: number;
  shares: number;
  completionRate: number;
  errorRate: number;
  avgDurationMs: number | null;
  peakHourUtc: number | null;
  hours: number[];
  daily: { day: string; views: number; executes: number }[];
  byTool: { slug: string; views: number; executes: number }[];
  countries: { code: string; count: number }[];
  cities: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  channels: { name: string; count: number }[];
}

function emptyDashboard(ready: boolean): UsageDashboard {
  return {
    ready,
    activeNow: 0,
    dau: 0,
    wau: 0,
    mau: 0,
    uniqueVisitors: 0,
    returningVisitors: 0,
    newVisitors: 0,
    pageviews: 0,
    executes: 0,
    errors: 0,
    copies: 0,
    downloads: 0,
    shares: 0,
    completionRate: 0,
    errorRate: 0,
    avgDurationMs: null,
    peakHourUtc: null,
    hours: Array.from({ length: 24 }, () => 0),
    daily: [],
    byTool: [],
    countries: [],
    cities: [],
    devices: [],
    browsers: [],
    channels: [],
  };
}

function whereSql(tenantId: string, filters: UsageFilters, extra?: Prisma.Sql) {
  const parts: Prisma.Sql[] = [
    Prisma.sql`"tenantId" = ${tenantId}`,
    Prisma.sql`"createdAt" >= ${filters.from}`,
    Prisma.sql`"createdAt" < ${filters.to}`,
  ];
  if (filters.tool) parts.push(Prisma.sql`"toolSlug" = ${filters.tool}`);
  if (filters.country) parts.push(Prisma.sql`"country" = ${filters.country}`);
  if (filters.channel) parts.push(Prisma.sql`"channel" = ${filters.channel}`);
  if (extra) parts.push(extra);
  return Prisma.join(parts, " AND ");
}

function dimensionSql(filters: UsageFilters) {
  const parts: Prisma.Sql[] = [];
  if (filters.tool) parts.push(Prisma.sql`"toolSlug" = ${filters.tool}`);
  if (filters.country) parts.push(Prisma.sql`"country" = ${filters.country}`);
  if (filters.channel) parts.push(Prisma.sql`"channel" = ${filters.channel}`);
  return parts.length ? Prisma.sql`AND ${Prisma.join(parts, " AND ")}` : Prisma.empty;
}

function num(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function loadUsageDashboard(tenantId: string, filters: UsageFilters): Promise<UsageDashboard> {
  try {
    const now = new Date();
    const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(dayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = new Date(dayStart);
    monthStart.setUTCDate(monthStart.getUTCDate() - 29);
    const dims = dimensionSql(filters);
    const range = whereSql(tenantId, filters);

    const [activeRows, audienceRows, totalsRows, durationRows, hourRows, dailyRows, toolRows, countryRows, cityRows, deviceRows, browserRows, channelRows] =
      await Promise.all([
        prisma.$queryRaw<{ n: unknown }[]>`
          SELECT COUNT(DISTINCT "visitorKey") AS n
          FROM usage_events
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${fiveMin}
            ${dims}
        `,
        prisma.$queryRaw<{ dau: unknown; wau: unknown; mau: unknown }[]>`
          SELECT
            COUNT(DISTINCT "visitorKey") FILTER (WHERE "createdAt" >= ${dayStart} AND "eventType" = 'pageview') AS dau,
            COUNT(DISTINCT "visitorKey") FILTER (WHERE "createdAt" >= ${weekStart} AND "eventType" = 'pageview') AS wau,
            COUNT(DISTINCT "visitorKey") FILTER (WHERE "createdAt" >= ${monthStart} AND "eventType" = 'pageview') AS mau
          FROM usage_events
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${monthStart}
            ${dims}
        `,
        prisma.$queryRaw<{
          views: unknown;
          executes: unknown;
          errors: unknown;
          copies: unknown;
          downloads: unknown;
          shares: unknown;
          visitors: unknown;
          returning: unknown;
        }[]>`
          SELECT
            COUNT(*) FILTER (WHERE "eventType" = 'pageview') AS views,
            COUNT(*) FILTER (WHERE "eventType" = 'execute') AS executes,
            COUNT(*) FILTER (WHERE "eventType" = 'execute_error') AS errors,
            COUNT(*) FILTER (WHERE "eventType" = 'copy') AS copies,
            COUNT(*) FILTER (WHERE "eventType" = 'download') AS downloads,
            COUNT(*) FILTER (WHERE "eventType" = 'share') AS shares,
            COUNT(DISTINCT "visitorKey") FILTER (WHERE "eventType" = 'pageview') AS visitors,
            COUNT(DISTINCT "visitorKey") FILTER (WHERE "eventType" = 'pageview' AND "returning" = true) AS "returning"
          FROM usage_events
          WHERE ${range}
        `,
        prisma.$queryRaw<{ avg: unknown }[]>`
          SELECT AVG("durationMs") AS avg
          FROM usage_events
          WHERE ${whereSql(tenantId, filters, Prisma.sql`"eventType" = 'execute' AND "durationMs" IS NOT NULL`)}
        `,
        prisma.$queryRaw<{ hour: unknown; n: unknown }[]>`
          SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*) AS n
          FROM usage_events
          WHERE ${range}
          GROUP BY 1
        `,
        prisma.$queryRaw<{ day: string; views: unknown; executes: unknown }[]>`
          SELECT to_char("createdAt", 'YYYY-MM-DD') AS day,
            COUNT(*) FILTER (WHERE "eventType" = 'pageview') AS views,
            COUNT(*) FILTER (WHERE "eventType" = 'execute') AS executes
          FROM usage_events
          WHERE ${range}
          GROUP BY 1
          ORDER BY 1
        `,
        prisma.$queryRaw<{ slug: string; views: unknown; executes: unknown }[]>`
          SELECT "toolSlug" AS slug,
            COUNT(*) FILTER (WHERE "eventType" = 'pageview') AS views,
            COUNT(*) FILTER (WHERE "eventType" = 'execute') AS executes
          FROM usage_events
          WHERE ${range}
          GROUP BY 1
          ORDER BY executes DESC, views DESC
          LIMIT 12
        `,
        prisma.$queryRaw<{ code: string; n: unknown }[]>`
          SELECT "country" AS code, COUNT(*) AS n
          FROM usage_events
          WHERE ${whereSql(tenantId, filters, Prisma.sql`"country" <> '' AND "eventType" = 'pageview'`)}
          GROUP BY 1
          ORDER BY n DESC
          LIMIT 8
        `,
        prisma.$queryRaw<{ name: string; n: unknown }[]>`
          SELECT "city" AS name, COUNT(*) AS n
          FROM usage_events
          WHERE ${whereSql(tenantId, filters, Prisma.sql`"city" <> '' AND "eventType" = 'pageview'`)}
          GROUP BY 1
          ORDER BY n DESC
          LIMIT 8
        `,
        prisma.$queryRaw<{ name: string; n: unknown }[]>`
          SELECT "device" AS name, COUNT(*) AS n
          FROM usage_events
          WHERE ${whereSql(tenantId, filters, Prisma.sql`"device" <> '' AND "eventType" = 'pageview'`)}
          GROUP BY 1
          ORDER BY n DESC
        `,
        prisma.$queryRaw<{ name: string; n: unknown }[]>`
          SELECT "browser" AS name, COUNT(*) AS n
          FROM usage_events
          WHERE ${whereSql(tenantId, filters, Prisma.sql`"eventType" = 'pageview'`)}
          GROUP BY 1
          ORDER BY n DESC
        `,
        prisma.$queryRaw<{ name: string; n: unknown }[]>`
          SELECT "channel" AS name, COUNT(*) AS n
          FROM usage_events
          WHERE ${whereSql(tenantId, filters, Prisma.sql`"eventType" = 'pageview'`)}
          GROUP BY 1
          ORDER BY n DESC
        `,
      ]);

    const totals = totalsRows[0];
    const pageviews = num(totals?.views);
    const executes = num(totals?.executes);
    const errors = num(totals?.errors);
    const visitors = num(totals?.visitors);
    const returning = num(totals?.returning);
    const hours = Array.from({ length: 24 }, () => 0);
    let peakHourUtc: number | null = null;
    let peakCount = 0;
    for (const row of hourRows) {
      const hour = num(row.hour);
      const count = num(row.n);
      if (hour >= 0 && hour < 24) hours[hour] = count;
      if (count > peakCount) {
        peakCount = count;
        peakHourUtc = hour;
      }
    }

    const endInclusive = new Date(filters.to);
    endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);

    return {
      ready: true,
      activeNow: num(activeRows[0]?.n),
      dau: num(audienceRows[0]?.dau),
      wau: num(audienceRows[0]?.wau),
      mau: num(audienceRows[0]?.mau),
      uniqueVisitors: visitors,
      returningVisitors: returning,
      newVisitors: Math.max(0, visitors - returning),
      pageviews,
      executes,
      errors,
      copies: num(totals?.copies),
      downloads: num(totals?.downloads),
      shares: num(totals?.shares),
      completionRate: pageviews ? (executes / pageviews) * 100 : 0,
      errorRate: executes + errors ? (errors / (executes + errors)) * 100 : 0,
      avgDurationMs: durationRows[0]?.avg == null ? null : num(durationRows[0]?.avg),
      peakHourUtc,
      hours,
      daily: fillDailySeries(
        dailyRows.map((row) => ({ day: String(row.day).slice(0, 10), views: num(row.views), executes: num(row.executes) })),
        filters.from,
        endInclusive
      ),
      byTool: toolRows.map((row) => ({ slug: row.slug, views: num(row.views), executes: num(row.executes) })),
      countries: countryRows.map((row) => ({ code: row.code, count: num(row.n) })),
      cities: cityRows.map((row) => ({ name: row.name, count: num(row.n) })),
      devices: deviceRows.map((row) => ({ name: row.name, count: num(row.n) })),
      browsers: browserRows.map((row) => ({ name: row.name, count: num(row.n) })),
      channels: channelRows.map((row) => ({ name: row.name, count: num(row.n) })),
    };
  } catch {
    console.error("[usage] dashboard query failed");
    return emptyDashboard(false);
  }
}

export async function loadActiveUsers(tenantId: string, filters: Pick<UsageFilters, "tool" | "country" | "channel">): Promise<number> {
  const fiveMin = new Date(Date.now() - 5 * 60 * 1000);
  const parts: Prisma.Sql[] = [Prisma.sql`"tenantId" = ${tenantId}`, Prisma.sql`"createdAt" >= ${fiveMin}`];
  if (filters.tool) parts.push(Prisma.sql`"toolSlug" = ${filters.tool}`);
  if (filters.country) parts.push(Prisma.sql`"country" = ${filters.country}`);
  if (filters.channel) parts.push(Prisma.sql`"channel" = ${filters.channel}`);
  const rows = await prisma.$queryRaw<{ n: unknown }[]>`
    SELECT COUNT(DISTINCT "visitorKey") AS n
    FROM usage_events
    WHERE ${Prisma.join(parts, " AND ")}
  `;
  return num(rows[0]?.n);
}
