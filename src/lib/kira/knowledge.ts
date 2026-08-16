import type { KarmaServiceSlug } from "./types";

/** Controlled facts only — Kira must not invent beyond this pack. */
export const KIRA_KNOWLEDGE = {
  company: {
    name: "KarmaKoders",
    url: "https://www.karmakoders.com",
    email: "info@karmakoders.com",
    tagline:
      "We design, engineer, and scale high-performance web, mobile, and AI solutions for startups and growing companies.",
    notes: [
      "NDA-friendly collaboration; NDAs before technical scoping.",
      "100% IP transfer after milestone sign-off.",
      "Contracts and invoicing in USD.",
      "Daily timezone overlap for USA/Canada clients; Slack, Teams, or Jira.",
      "Bi-weekly agile sprints with staging demos.",
    ],
  },
  services: [
    {
      slug: "custom-software" as KarmaServiceSlug,
      name: "Custom Software Development",
      description:
        "Enterprise-grade bespoke software systems for complex business operations with robust architectures and data safety.",
    },
    {
      slug: "mobile-apps" as KarmaServiceSlug,
      name: "Mobile App Development",
      description:
        "Native iOS and Android solutions, plus React Native / Flutter cross-platform apps.",
    },
    {
      slug: "ai-solutions" as KarmaServiceSlug,
      name: "AI Solutions & Integrations",
      description:
        "LLMs, neural search, custom ML pipelines, and agentic workflows integrated into products.",
    },
    {
      slug: "saas-products" as KarmaServiceSlug,
      name: "SaaS Development",
      description:
        "Scalable multi-tenant subscription products with billing, analytics, and cloud-ready architecture.",
    },
    {
      slug: "website-engineering" as KarmaServiceSlug,
      name: "Website Development",
      description:
        "Premium corporate sites and headless web platforms optimized for speed, SEO, and conversion.",
    },
    {
      slug: "ui-ux-design" as KarmaServiceSlug,
      name: "UI/UX Design & Branding",
      description:
        "High-end interfaces, wireframes, interactive prototypes, and design systems.",
    },
    {
      slug: "cloud-devops" as KarmaServiceSlug,
      name: "Cloud Engineering & DevOps",
      description:
        "Secure auto-scaling deployments on AWS, Google Cloud, and related CI/CD and monitoring.",
    },
    {
      slug: "custom-scope" as KarmaServiceSlug,
      name: "Bespoke Enterprise Solutions",
      description:
        "Custom roadmaps, specialized integrations, and unique technical architectures.",
    },
  ],
  process: [
    {
      title: "Discovery & Research",
      description:
        "Analyze business goals, audience, requirements, and competitors under NDA.",
    },
    {
      title: "Strategic Planning",
      description:
        "Architecture, tech stack, user flows, and bi-weekly sprint milestones.",
    },
    {
      title: "High-Fidelity UI/UX Design",
      description:
        "Custom interfaces and scalable design systems aligned to the brand.",
    },
    {
      title: "Full-Stack Development",
      description:
        "Senior engineers build with modern stacks such as Next.js, TypeScript, and solid databases.",
    },
    {
      title: "Rigorous QA & Testing",
      description:
        "Automated tests, end-to-end paths, security, accessibility, and performance checks.",
    },
    {
      title: "Production Launch",
      description:
        "Deployment, migrations, DNS, and launch readiness with minimal downtime.",
    },
    {
      title: "Post-Launch Support",
      description:
        "Maintenance, security updates, backups, and iterative improvements from live data.",
    },
  ],
  engagementModels: [
    {
      name: "Starter",
      idealFor: "Early-stage founders validating an idea",
      projectType: "MVPs, landing pages, simple SaaS, branding",
      timeline: "About 2 to 4 weeks",
    },
    {
      name: "Growth",
      idealFor: "Startups and companies scaling a product",
      projectType: "Full SaaS, native mobile, advanced dashboards",
      timeline: "About 1 to 3 months",
    },
    {
      name: "Enterprise",
      idealFor: "Larger teams needing compliance and dedicated support",
      projectType: "Complex systems, regulated platforms, long-term partnership",
      timeline: "Long-term partnership",
    },
  ],
  techStack: [
    "Next.js",
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "React Native",
    "Swift",
    "Kotlin",
    "Flutter",
    "PostgreSQL",
    "MongoDB",
    "AWS",
    "Google Cloud",
    "Docker",
    "OpenAI / LLM integrations",
  ],
  faqs: [
    {
      q: "Do you sign NDAs?",
      a: "Yes. NDAs before technical scoping, code audits, or system design discussions.",
    },
    {
      q: "Who owns the IP?",
      a: "After a milestone is delivered and signed off, IP and repository access transfer to the client.",
    },
    {
      q: "How does billing work?",
      a: "USD contracts via secure invoicing. Fixed-price scopes for validated MVPs, or dedicated monthly engineer retainers for growing SaaS.",
    },
    {
      q: "How do you work across time zones?",
      a: "Daily overlap during US working hours with stand-ups and sprint reviews; communication on Slack, Teams, or Jira.",
    },
  ],
  pricingGuidance: [
    "Do not invent custom project prices.",
    "Website pricing page plans (Starter/Professional/Enterprise monthly figures) describe packaged offerings — do not treat them as custom-build quotes.",
    "For custom builds, invite a free scoping assessment or discovery call.",
    "Budget ranges are optional; never pressure the visitor.",
  ],
  contact: {
    discoveryPath: "/contact",
    estimatePath: "/contact?type=estimate",
    responseExpectation: "Senior systems architect response target under 12 hours.",
  },
  forbidden: [
    "Invented clients, testimonials, awards, team size, or project statistics",
    "Invented pricing guarantees or delivery dates not on the site",
    "Services KarmaKoders does not list",
    "Fake partnerships or certifications",
  ],
} as const;

export function formatKnowledgeForPrompt(): string {
  const k = KIRA_KNOWLEDGE;
  return [
    `Company: ${k.company.name} (${k.company.url})`,
    `Email: ${k.company.email}`,
    `About: ${k.company.tagline}`,
    `Notes: ${k.company.notes.join(" | ")}`,
    "",
    "Services (ONLY recommend from this list):",
    ...k.services.map((s) => `- ${s.name} [${s.slug}]: ${s.description}`),
    "",
    "Development process:",
    ...k.process.map((p, i) => `${i + 1}. ${p.title} — ${p.description}`),
    "",
    "Engagement models:",
    ...k.engagementModels.map(
      (m) =>
        `- ${m.name}: ${m.idealFor}. Typical: ${m.projectType}. Timeline: ${m.timeline}.`
    ),
    "",
    `Tech stack examples: ${k.techStack.join(", ")}`,
    "",
    "FAQs:",
    ...k.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`),
    "",
    "Pricing rules:",
    ...k.pricingGuidance.map((p) => `- ${p}`),
    "",
    `Contact: discovery ${k.contact.discoveryPath}, estimate ${k.contact.estimatePath}. ${k.contact.responseExpectation}`,
    "",
    "Never invent:",
    ...k.forbidden.map((f) => `- ${f}`),
  ].join("\n");
}
