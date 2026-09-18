export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  country: string;
  linkedin?: string;
  videoUrl?: string;
};

/** Placeholder quotes until Lucky supplies approved client names, photos, and LinkedIn URLs. */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "They scoped the MVP in one call and shipped a production-ready first release without the usual agency runaround.",
    name: "Alex Rivera",
    role: "Founder",
    company: "Northstar Labs",
    country: "United States",
    linkedin: "https://www.linkedin.com",
  },
  {
    quote:
      "Timezone overlap actually meant daily stand-ups on EST. We never waited overnight for a blocker.",
    name: "Priya Menon",
    role: "Head of Product",
    company: "Harbor Health",
    country: "Singapore",
  },
  {
    quote:
      "Clear USD pricing, an NDA before discovery, and a senior architect on the thread from week one.",
    name: "James Okonkwo",
    role: "CTO",
    company: "Ledgerline",
    country: "United States",
    videoUrl: "",
  },
];

export const CLIENT_LOGOS = [
  { name: "Surventix" },
  { name: "8Hearts" },
  { name: "Breaking Barriers" },
  { name: "ToletIndia" },
  { name: "OneRoute" },
  { name: "Done" },
] as const;

export const CLIENT_LOGO_LABEL = "Trusted by teams in India, Singapore and the US";
