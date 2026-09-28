export interface DailyPoint {
  day: string;
  views: number;
  executes: number;
}

export function fillDailySeries(rows: DailyPoint[], from: Date, to: Date): DailyPoint[] {
  const map = new Map(rows.map((row) => [row.day, row]));
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  if (end.getTime() < cursor.getTime()) return [];
  const out: DailyPoint[] = [];
  while (cursor.getTime() <= end.getTime() && out.length < 400) {
    const day = cursor.toISOString().slice(0, 10);
    out.push(map.get(day) ?? { day, views: 0, executes: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export interface UsageFilterInput {
  from?: string;
  to?: string;
  tool?: string;
  country?: string;
  channel?: string;
}

export interface UsageFilters {
  from: Date;
  to: Date;
  tool: string;
  country: string;
  channel: string;
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseUsageFilters(input: UsageFilterInput, now = new Date()): UsageFilters {
  const today = utcDay(now);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const from = parseDay(input.from) ?? defaultFrom;
  let to = parseDay(input.to) ?? today;
  if (to.getTime() < from.getTime()) to = from;
  const maxTo = new Date(from);
  maxTo.setUTCDate(maxTo.getUTCDate() + 365);
  if (to.getTime() > maxTo.getTime()) to = maxTo;

  const exclusiveTo = new Date(to);
  exclusiveTo.setUTCDate(exclusiveTo.getUTCDate() + 1);

  const tool = (input.tool || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
  const country = /^[A-Za-z]{2}$/.test(input.country || "") ? (input.country || "").toUpperCase() : "";
  const channel = ["direct", "organic", "social", "referral"].includes(input.channel || "") ? input.channel || "" : "";

  return { from, to: exclusiveTo, tool, country, channel };
}

function parseDay(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function filterQuery(filters: UsageFilters): string {
  const end = new Date(filters.to);
  end.setUTCDate(end.getUTCDate() - 1);
  const params = new URLSearchParams();
  params.set("from", filters.from.toISOString().slice(0, 10));
  params.set("to", end.toISOString().slice(0, 10));
  if (filters.tool) params.set("tool", filters.tool);
  if (filters.country) params.set("country", filters.country);
  if (filters.channel) params.set("channel", filters.channel);
  return params.toString();
}
