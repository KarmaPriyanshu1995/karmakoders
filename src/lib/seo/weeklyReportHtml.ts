export interface WeeklyReportScores {
  technical: number;
  content: number;
  entity: number;
  internalLink: number;
  schema: number;
  ctr: number;
  overall: number;
}

export interface WeeklyReportAudit {
  totalPages: number;
  indexedPages: number;
  nonIndexedPages: number;
  missingTitles: number;
  missingDescriptions: number;
  brokenLinks: number;
  orphanPages: number;
  issuesCount: number;
}

export interface WeeklyReportSearchConsole {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface WeeklyReportSummary {
  scores: WeeklyReportScores;
  audit: WeeklyReportAudit;
  searchConsole: WeeklyReportSearchConsole | null;
  generatedAt: string;
}

const EMPTY_SCORES: WeeklyReportScores = {
  technical: 0,
  content: 0,
  entity: 0,
  internalLink: 0,
  schema: 0,
  ctr: 0,
  overall: 0,
};

const EMPTY_AUDIT: WeeklyReportAudit = {
  totalPages: 0,
  indexedPages: 0,
  nonIndexedPages: 0,
  missingTitles: 0,
  missingDescriptions: 0,
  brokenLinks: 0,
  orphanPages: 0,
  issuesCount: 0,
};

export function parseWeeklyReportSummary(raw: unknown): WeeklyReportSummary {
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  if (!value || typeof value !== "object") {
    return { scores: { ...EMPTY_SCORES }, audit: { ...EMPTY_AUDIT }, searchConsole: null, generatedAt: new Date().toISOString() };
  }
  const obj = value as Record<string, unknown>;
  const scores = (obj.scores ?? {}) as Record<string, unknown>;
  const audit = (obj.audit ?? {}) as Record<string, unknown>;
  const gsc = obj.searchConsole && typeof obj.searchConsole === "object"
    ? (obj.searchConsole as Record<string, unknown>)
    : null;

  return {
    scores: {
      technical: num(scores.technical),
      content: num(scores.content),
      entity: num(scores.entity),
      internalLink: num(scores.internalLink),
      schema: num(scores.schema),
      ctr: num(scores.ctr),
      overall: num(scores.overall),
    },
    audit: {
      totalPages: num(audit.totalPages),
      indexedPages: num(audit.indexedPages),
      nonIndexedPages: num(audit.nonIndexedPages),
      missingTitles: num(audit.missingTitles),
      missingDescriptions: num(audit.missingDescriptions),
      brokenLinks: num(audit.brokenLinks),
      orphanPages: num(audit.orphanPages),
      issuesCount: num(audit.issuesCount),
    },
    searchConsole: gsc
      ? {
          clicks: num(gsc.clicks),
          impressions: num(gsc.impressions),
          ctr: num(gsc.ctr),
          position: num(gsc.position),
        }
      : null,
    generatedAt: typeof obj.generatedAt === "string" ? obj.generatedAt : new Date().toISOString(),
  };
}

export function renderWeeklyReportHtml(options: {
  title: string;
  brandName: string;
  summary: WeeklyReportSummary;
}): string {
  const title = escapeHtml(options.title);
  const brand = escapeHtml(options.brandName || "Karmakoders");
  const { scores, audit, searchConsole, generatedAt } = options.summary;
  const generated = escapeHtml(formatDate(generatedAt));
  const overallColor = scoreColor(scores.overall);

  const scoreRows = [
    ["Technical", scores.technical],
    ["Content", scores.content],
    ["Entity", scores.entity],
    ["Internal links", scores.internalLink],
    ["Schema", scores.schema],
    ["CTR", scores.ctr],
  ]
    .map(([label, value]) => {
      const n = Number(value);
      return `<tr>
        <td>${escapeHtml(String(label))}</td>
        <td class="num" style="color:${scoreColor(n)}">${n}</td>
        <td><div class="bar"><span style="width:${Math.min(100, Math.max(0, n))}%;background:${scoreColor(n)}"></span></div></td>
      </tr>`;
    })
    .join("");

  const gscBlock = searchConsole
    ? `<section>
        <h2>Search Console</h2>
        <div class="grid">
          <div class="stat"><span>Clicks</span><strong>${searchConsole.clicks}</strong></div>
          <div class="stat"><span>Impressions</span><strong>${searchConsole.impressions}</strong></div>
          <div class="stat"><span>CTR</span><strong>${formatPct(searchConsole.ctr)}</strong></div>
          <div class="stat"><span>Avg position</span><strong>${searchConsole.position.toFixed(1)}</strong></div>
        </div>
      </section>`
    : `<section><h2>Search Console</h2><p class="muted">Not connected for this period.</p></section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1C1B1A; background: #f7f4ec; margin: 0; }
    .sheet { max-width: 820px; margin: 32px auto; background: #fff; padding: 40px 48px; box-shadow: 0 12px 40px rgba(28,27,26,0.08); }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 16px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b675f; margin: 32px 0 12px; }
    .meta { color: #6b675f; font-size: 13px; }
    .overall { display: flex; align-items: center; gap: 24px; border: 1px solid #ece7d8; border-radius: 16px; padding: 20px 24px; margin-top: 24px; }
    .score { font-size: 56px; font-weight: 800; line-height: 1; color: ${overallColor}; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; border-bottom: 1px solid #f0ebe0; font-size: 14px; }
    td.num { width: 48px; font-weight: 700; text-align: right; padding-right: 12px; }
    .bar { height: 8px; background: #f0ebe0; border-radius: 99px; overflow: hidden; }
    .bar span { display: block; height: 100%; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat { background: #f7f4ec; border-radius: 12px; padding: 12px; }
    .stat span { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b675f; }
    .stat strong { font-size: 22px; }
    .muted { color: #6b675f; }
    .brand { color: #c9a000; font-weight: 800; }
    @media print {
      body { background: #fff; }
      .sheet { margin: 0; box-shadow: none; max-width: none; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <p class="brand">${brand} · SEO Intelligence</p>
    <h1>${title}</h1>
    <p class="meta">Generated ${generated}. Print this page or use Save as PDF.</p>
    <div class="overall">
      <div class="score">${scores.overall}</div>
      <div>
        <strong>Overall health score</strong>
        <p class="muted">Weighted technical, content, entity, internal link, schema, and CTR scores.</p>
      </div>
    </div>
    <section>
      <h2>Score breakdown</h2>
      <table>${scoreRows}</table>
    </section>
    <section>
      <h2>Audit snapshot</h2>
      <div class="grid">
        <div class="stat"><span>Pages</span><strong>${audit.totalPages}</strong></div>
        <div class="stat"><span>Indexed</span><strong>${audit.indexedPages}</strong></div>
        <div class="stat"><span>Open issues</span><strong>${audit.issuesCount}</strong></div>
        <div class="stat"><span>Orphans</span><strong>${audit.orphanPages}</strong></div>
      </div>
      <p class="muted" style="margin-top:16px">
        Missing titles: ${audit.missingTitles} · Missing descriptions: ${audit.missingDescriptions} ·
        Broken links: ${audit.brokenLinks} · Non-indexed: ${audit.nonIndexedPages}
      </p>
    </section>
    ${gscBlock}
  </article>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

function formatPct(value: number): string {
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(1)}%`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 70) return "#15803d";
  if (score >= 50) return "#b45309";
  return "#b91c1c";
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
