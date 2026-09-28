export type AssistantIssue = {
  type: string;
  severity: string;
  description: string;
  url?: string | null;
};

export type SeoAssistantSnapshot = {
  scores: {
    overall: number;
    technical: number;
    content: number;
    schema: number;
    entity: number;
    internalLink: number;
  };
  audit: {
    totalPages: number;
    missingTitles: number;
    missingDescriptions: number;
    missingSchema: number;
    orphanPages: number;
    lowContentPages: number;
  };
  issues: AssistantIssue[];
  clusters: Array<{ name: string; healthScore: number; missing: string[] }>;
  gscConnected: boolean;
  gscClicks: number;
  keywords: Array<{ keyword: string; position: number | null }>;
  lastAutomationAt: string | null;
  brandName: string | null;
};

export type AssistantReply = {
  reply: string;
  intent: string;
  citations: string[];
};

function line(label: string, value: string | number) {
  return `- ${label}: ${value}`;
}

function topIssues(snapshot: SeoAssistantSnapshot, limit = 5) {
  return snapshot.issues.slice(0, limit);
}

export function detectAssistantIntent(question: string): string {
  const q = question.toLowerCase();
  if (/\b(schema|json-ld|structured data|rich result)\b/.test(q)) return "schema";
  if (/\b(ctr|title|meta description|click.?through)\b/.test(q)) return "ctr";
  if (/\b(orphan|internal link|linking)\b/.test(q)) return "links";
  if (/\b(e-?e-?a-?t|trust|author|credential)\b/.test(q)) return "eeat";
  if (/\b(cluster|pillar|topical|authority)\b/.test(q)) return "clusters";
  if (/\b(gsc|search console|impressions|ranking)\b/.test(q)) return "gsc";
  if (/\b(automat|bulk|optimize entire|run rules)\b/.test(q)) return "automation";
  if (/\b(faq|thin|word count|content)\b/.test(q)) return "content";
  if (/\b(audit|score|health|what.?s wrong|status)\b/.test(q)) return "audit";
  return "audit";
}

export function answerSeoQuestion(question: string, snapshot: SeoAssistantSnapshot): AssistantReply {
  const intent = detectAssistantIntent(question);
  const citations: string[] = [];
  const brand = snapshot.brandName || "this site";
  const issues = topIssues(snapshot);

  if (intent === "schema") {
    citations.push(`/admin/seo/schema`);
    return {
      intent,
      citations,
      reply: [
        `${brand} is missing schema on ${snapshot.audit.missingSchema} of ${snapshot.audit.totalPages} tracked URLs (schema score ${snapshot.scores.schema}).`,
        "Use Schema Center → Auto JSON-LD from brand to apply Organization, Website, Person, and Service markup, then re-analyze pages.",
        issues.find((i) => /schema/i.test(i.type) || /schema/i.test(i.description))
          ? `Open issue: ${issues.find((i) => /schema/i.test(i.type) || /schema/i.test(i.description))?.description}`
          : "No schema-specific issue rows are open, but coverage is still incomplete.",
      ].join("\n"),
    };
  }

  if (intent === "ctr") {
    citations.push(`/admin/seo/search-console`, `/admin/seo/ctr`);
    const titles = snapshot.audit.missingTitles;
    return {
      intent,
      citations,
      reply: [
        `CTR work starts with titles and GSC. ${titles} pages are missing meta titles. GSC is ${snapshot.gscConnected ? `connected (${snapshot.gscClicks} clicks in the last snapshot)` : "not connected — deltas only exist after you save a snapshot"}.`,
        "Keep titles 50–60 characters with a clear offer. Descriptions 140–160 characters. Then run Page Optimizer and Apply to write them.",
        snapshot.keywords[0]
          ? `Highest-opportunity query on file: “${snapshot.keywords[0].keyword}”${snapshot.keywords[0].position != null ? ` (position ${snapshot.keywords[0].position})` : ""}.`
          : "No keyword opportunities stored yet — connect GSC or import a snapshot.",
      ].join("\n"),
    };
  }

  if (intent === "links") {
    citations.push(`/admin/seo/internal-links`);
    return {
      intent,
      citations,
      reply: [
        `Internal-link score is ${snapshot.scores.internalLink}. ${snapshot.audit.orphanPages} orphan pages are flagged.`,
        "Run Internal Links → Scan, then apply suggestions. Automation can also suggest links when that rule is enabled.",
      ].join("\n"),
    };
  }

  if (intent === "eeat") {
    citations.push(`/admin/seo/content`, `/admin/seo/brand`);
    return {
      intent,
      citations,
      reply: [
        `Content score is ${snapshot.scores.content}; entity score ${snapshot.scores.entity}.`,
        "Raise E-E-A-T with a named author, first-party shipping language, NDA/SLA trust copy, and brand JSON-LD from the Entity center.",
        "The About page already carries the team block — keep it to real people in Site Content, not placeholder names.",
      ].join("\n"),
    };
  }

  if (intent === "clusters") {
    citations.push(`/admin/seo/authority`);
    const weak = snapshot.clusters.filter((c) => c.healthScore < 50);
    const missing = snapshot.clusters.flatMap((c) => c.missing).slice(0, 5);
    return {
      intent,
      citations,
      reply: [
        snapshot.clusters.length
          ? `${snapshot.clusters.length} topical clusters are mapped. Weak clusters: ${weak.map((c) => c.name).join(", ") || "none"}.`
          : "No clusters yet. Open Topical Authority and click Map from content.",
        missing.length ? `Suggested missing pieces: ${missing.join("; ")}.` : "No missing-topic list on file.",
      ].join("\n"),
    };
  }

  if (intent === "gsc") {
    citations.push(`/admin/seo/search-console`);
    return {
      intent,
      citations,
      reply: snapshot.gscConnected
        ? `Search Console is marked connected with ${snapshot.gscClicks} clicks in the stored snapshot. Open GSC Center for deltas versus the previous fetch. Google API credentials are optional — a pasted snapshot still computes ranking drops.`
        : "Search Console is not connected. Save a site URL in GSC Center. Without Google credentials the panel stores honest zeros and later deltas, and will not invent traffic.",
    };
  }

  if (intent === "automation") {
    citations.push(`/admin/seo/automation`);
    return {
      intent,
      citations,
      reply: [
        snapshot.lastAutomationAt
          ? `Last automation log: ${snapshot.lastAutomationAt}.`
          : "No automation runs logged yet.",
        "Enable meta title/description rules, then Run Automation. For a single URL use AI Assistant → Optimize Entire Page → Apply to page.",
      ].join("\n"),
    };
  }

  if (intent === "content") {
    citations.push(`/admin/seo/content`);
    return {
      intent,
      citations,
      reply: [
        `${snapshot.audit.lowContentPages} pages are flagged thin. Content score ${snapshot.scores.content}.`,
        "Target 600–800+ words, an FAQ block, and E-E-A-T markers. Generate FAQs in the Page Optimizer, then expand in the CMS — this assistant does not invent client metrics.",
      ].join("\n"),
    };
  }

  citations.push(`/admin/seo`);
  const issueLines = issues.length
    ? issues.map((i) => line(i.severity, `${i.description}${i.url ? ` (${i.url})` : ""}`)).join("\n")
    : "- No open issue rows.";

  return {
    intent: "audit",
    citations,
    reply: [
      `Site health for ${brand}: overall ${snapshot.scores.overall} (tech ${snapshot.scores.technical}, content ${snapshot.scores.content}, schema ${snapshot.scores.schema}).`,
      `${snapshot.audit.totalPages} URLs · missing titles ${snapshot.audit.missingTitles} · missing descriptions ${snapshot.audit.missingDescriptions} · missing schema ${snapshot.audit.missingSchema} · orphans ${snapshot.audit.orphanPages}.`,
      "Open issues:",
      issueLines,
      "Ask about schema, CTR, clusters, GSC, orphans, or automation for a focused next step.",
    ].join("\n"),
  };
}
