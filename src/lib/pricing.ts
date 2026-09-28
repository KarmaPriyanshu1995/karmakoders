/**
 * Indicative commercial anchors. Swap these strings when Lucky supplies
 * production starter / growth / enterprise / retainer numbers.
 */
export const PRICING = {
  placeholder: true,
  disclaimer:
    "Indicative starting points in USD. Final scope and price are confirmed on a discovery call.",
  tiers: [
    {
      id: "starter",
      name: "Starter",
      from: "Starting from $5,000",
      typical: "Typical range $5k–$12k",
      popular: false,
      description: "Bespoke MVP and landing page architectures for early-stage startups establishing market validation.",
      features: [
        "Custom UI/UX & design prototype",
        "Full-stack Next.js web application",
        "Core AI/database integrations",
        "Standard SEO & setup",
        "1 Month support & maintenance",
      ],
    },
    {
      id: "growth",
      name: "Growth",
      from: "From $15,000",
      typical: "Typical range $15k–$40k",
      popular: true,
      description: "Advanced applications and custom SaaS products engineered to scale with your growing business.",
      features: [
        "Bespoke interactive 3D assets",
        "Scalable multi-tenant cloud setup",
        "Advanced AI model orchestrations",
        "Comprehensive compliance frameworks",
        "3 Months priority maintenance",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      from: "Custom",
      typical: "Scoped per program",
      popular: false,
      description: "Fully customized software solutions built with strict compliance, security, and dedicated teams.",
      features: [
        "Private server & database setup",
        "SOC 2, HIPAA, and GDPR compliance",
        "Dedicated senior engineers & PM",
        "Continuous QA & security audits",
        "12 Months SLAs & support packages",
      ],
    },
  ],
  retainer: {
    name: "Dedicated engineer",
    from: "From $8,000/month",
    typical: "Monthly retainer, cancel with 30 days notice",
    description: "A senior engineer embedded with your team — stand-ups on EST, Slack, and a named backup.",
  },
  comparison: [
    { label: "Timeline", starter: "2–4 weeks", growth: "1–3 months", enterprise: "Ongoing partnership" },
    { label: "Team size", starter: "2–3 people", growth: "4–6 people", enterprise: "Dedicated pod" },
    { label: "Support", starter: "1 month", growth: "3 months", enterprise: "12-month SLA" },
    { label: "Compliance", starter: "Standard controls", growth: "SOC 2 path", enterprise: "HIPAA / SOC 2" },
    { label: "IP transfer", starter: "At milestone sign-off", growth: "At milestone sign-off", enterprise: "At milestone sign-off" },
  ],
  faqs: [
    {
      question: "Why no fixed price on the website?",
      answer:
        "Scope, compliance, and integrations change the build. The numbers here are starting anchors so you can compare tiers. The discovery call produces a fixed-scope proposal.",
    },
    {
      question: "What is the payment schedule?",
      answer:
        "Typical MVPs are 40% to start, 40% at the mid-build demo, and 20% on launch. Retainers are billed monthly in USD.",
    },
    {
      question: "What happens after the call?",
      answer:
        "You get a written scope, timeline, and investment range within 12 hours. No commitment until you sign the proposal and NDA.",
    },
  ],
} as const;

export function pricingForTier(name: string) {
  const key = name.trim().toLowerCase();
  return PRICING.tiers.find((tier) => tier.name.toLowerCase() === key) ?? PRICING.tiers[0];
}
