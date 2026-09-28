export type EatAnalysis = {
  experience: number;
  expertise: number;
  authoritativeness: number;
  trust: number;
  score: number;
  markers: string[];
};

function scorePatterns(text: string, patterns: Array<{ re: RegExp; label: string; weight: number }>, cap: number) {
  let score = 0;
  const markers: string[] = [];
  for (const pattern of patterns) {
    if (pattern.re.test(text)) {
      score += pattern.weight;
      markers.push(pattern.label);
    }
  }
  return { score: Math.min(cap, score), markers };
}

export function analyzeEat(text: string, html = ""): EatAnalysis {
  const hay = `${text}\n${html}`.toLowerCase();

  const experience = scorePatterns(hay, [
    { re: /\bwe (shipped|built|launched|delivered)\b/, label: "first-party delivery language", weight: 25 },
    { re: /\b(case study|client|production|live in)\b/, label: "client or production proof", weight: 20 },
    { re: /\b(roi|before vs after|reduced|increased)\b/, label: "outcome metrics", weight: 20 },
    { re: /\b(i |our team|we )\b/, label: "first-person experience", weight: 15 },
  ], 100);

  const expertise = scorePatterns(hay, [
    { re: /\b(architect|senior|cto|engineer|specialist)\b/, label: "credential language", weight: 20 },
    { re: /\b(next\.js|react|typescript|prisma|kubernetes|aws)\b/, label: "named technologies", weight: 25 },
    { re: /\b(years?|sprint|architecture|schema|api)\b/, label: "domain terminology", weight: 20 },
    { re: /\bhow (to|we)\b/, label: "explanatory depth", weight: 15 },
  ], 100);

  const authoritativenessPatterns: Array<{ re: RegExp; label: string; weight: number }> = [
    { re: /\b(according to|cited|source|published|award)\b/, label: "citations or awards", weight: 25 },
    { re: /\b(google|clutch|forrester|gartner)\b/, label: "named authority", weight: 20 },
    { re: /\b(author|founder|reviewed by)\b/, label: "named author", weight: 20 },
  ];
  if (/<a [^>]*href=["']https?:\/\//i.test(html) || /https?:\/\//i.test(text)) {
    authoritativenessPatterns.push({ re: /https?:\/\//i, label: "outbound references", weight: 20 });
  }
  const authoritativeness = scorePatterns(hay, authoritativenessPatterns, 100);

  const trust = scorePatterns(hay, [
    { re: /\b(nda|privacy|gdpr|soc 2|hipaa)\b/, label: "compliance / legal trust", weight: 25 },
    { re: /\b(contact|email|phone|hours)\b/, label: "reachable contact", weight: 20 },
    { re: /\b(testimonial|guarantee|sla|milestone)\b/, label: "delivery guarantees", weight: 20 },
    { re: /\bhttps:\/\//, label: "https references", weight: 15 },
  ], 100);

  const markers = [...experience.markers, ...expertise.markers, ...authoritativeness.markers, ...trust.markers];
  const score = Math.round(
    experience.score * 0.25 + expertise.score * 0.25 + authoritativeness.score * 0.25 + trust.score * 0.25
  );

  return {
    experience: experience.score,
    expertise: expertise.score,
    authoritativeness: authoritativeness.score,
    trust: trust.score,
    score,
    markers: [...new Set(markers)],
  };
}
