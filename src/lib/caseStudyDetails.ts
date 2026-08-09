// Structured Problem / Solution / Outcome copy for portfolio projects, keyed by slug.
// Shared between the portfolio grid (ProjectsSectionClient) and the case-study detail
// page so both surfaces tell the same story instead of duplicating copy.
export interface CaseStudyDetail {
  problem: string;
  solution: string;
  outcome: string;
}

export const structuredCaseStudies: Record<string, CaseStudyDetail> = {
  "quantum-pay": {
    problem: "Traditional cross-border payments took 2-4 days with high transaction fees, causing 45% checkout abandonment for merchants.",
    solution: "Engineered a secure, decentralized payment routing gateway on Next.js, integrating custom smart contracts that settle payments under 5 seconds.",
    outcome: "Reduced checkout abandonment by 35% and cut transaction fees by 60% globally.",
  },
  "nova-health": {
    problem: "Patients faced long wait times (4+ hours) to consult health specialists online, with no instant symptoms sorting tool.",
    solution: "Built a cross-platform mobile application combining a secure TensorFlow screening bot with encrypted WebRTC peer video routing.",
    outcome: "Reduced patient connection times to under 8 minutes with a 99.9% telemedicine connection SLA.",
  },
  "evo-stream": {
    problem: "High-fidelity spatial audio and video streams suffered from severe buffering delays and expensive cloud distribution costs.",
    solution: "Architected a custom media slicing pipeline paired with optimized AWS S3 bucket caching and CloudFront CDN routing.",
    outcome: "Reduced buffering latency by 95% while supporting 140% growth in concurrent streams.",
  },
  "aura-home": {
    problem: "International luxury property buyers had no realistic way to walk through listings remotely, resulting in slow sales cycles.",
    solution: "Created interactive, photorealistic web-based 3D virtual tours rendering high-poly models in real-time via Three.js.",
    outcome: "Sped up property sales closings by 40% and generated 2.2x more overseas leads.",
  },
};

// Slugs whose data comes from DEFAULT_PROJECTS (local seed/demo fallback), not a real
// database row. Anything in this set must be visually labeled per the "no fabricated
// results" rule — these are illustrative concepts, not client-verified outcomes.
export const DEMO_PROJECT_SLUGS = new Set(Object.keys(structuredCaseStudies));

export function getCaseStudyDetail(slug: string, fallback: CaseStudyDetail): CaseStudyDetail {
  return structuredCaseStudies[slug] || fallback;
}

// Returns curated Problem/Solution/Outcome copy only when we actually have it for this
// slug. Callers must NOT invent a generic "outcome" for real, non-demo projects — the
// Project data model has no verified-metric field, so claiming one would be fabricated.
export function findCaseStudyDetail(slug: string): CaseStudyDetail | undefined {
  return structuredCaseStudies[slug];
}
