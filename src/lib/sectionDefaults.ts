import { SITE_PAGES } from "./sitePages";

export interface DefaultSection {
  id: string;
  type: string;
  order: number;
  content: Record<string, unknown>;
}

const DEFAULT_PRICING_PLANS = [
  {
    name: "Starter",
    monthlyPrice: "$99",
    yearlyPrice: "$950",
    description: "Perfect for stealth startups looking to establish a premium digital footprint.",
    features: ["1 Landing Page", "Basic Animations", "Standard SEO", "Email Support", "1 Month Maintenance"],
    isPopular: false,
  },
  {
    name: "Professional",
    monthlyPrice: "$299",
    yearlyPrice: "$2,850",
    description: "The ideal solution for growing tech agencies needing advanced features and AI.",
    features: ["Up to 5 Pages", "Advanced 3D Effects", "Full AI Agent Integration", "24/7 Priority Support", "3 Months Maintenance", "Dynamic CMS Access"],
    isPopular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    description: "Fully bespoke SaaS architectures for large-scale enterprise requirements.",
    features: ["Unlimited Pages", "Custom 3D Environments", "Private AI Model Training", "Dedicated Engineering Team", "12 Months Maintenance", "Multi-region Support"],
    isPopular: false,
  },
];

const DEFAULT_FAQS = [
  {
    question: "How long does a typical project take?",
    answer: "Project timelines vary depending on complexity. A standard landing page takes about 2-3 weeks, while complex platforms can take 2-4 months.",
  },
  {
    question: "What industries do you specialize in?",
    answer: "We have experience across fintech, healthcare, e-commerce, real estate, and entertainment.",
  },
  {
    question: "Do you offer post-launch support?",
    answer: "Yes, we provide tiered maintenance and support packages to ensure your platform remains secure and up-to-date.",
  },
  {
    question: "Can you work with our existing brand guidelines?",
    answer: "Absolutely. We can build upon your existing brand identity or help you evolve it into a modern digital-first aesthetic.",
  },
  {
    question: "How does your AI redesign system work?",
    answer: "Our proprietary AI engine analyzes design trends and user inspiration images to generate dynamic theme tokens.",
  },
];

function contentSection(slug: string, title: string, body?: string): DefaultSection {
  return {
    id: `section-content-${slug}`,
    type: "content",
    order: 0,
    content: {
      tagline: title,
      heading: title,
      body: body ?? `<p>This is the default content for ${title}. You can edit this in the admin dashboard.</p>`,
    },
  };
}

/** Default section layouts keyed by page slug — covers every page in SITE_PAGES. */
export const PAGE_SECTION_DEFAULTS: Record<string, DefaultSection[]> = {
  home: [
    {
      id: "section-hero-home",
      type: "hero",
      order: 0,
      content: {
        headline: "Design the Future of Your Brand",
        subheadline:
          "We build premium, scalable, and immersive web platforms powered by advanced AI and cutting-edge 3D technologies.",
        ctaPrimary: "Explore Portfolio",
        ctaSecondary: "Our Services",
      },
    },
    { id: "section-partners-home", type: "partners", order: 1, content: {} },
    {
      id: "section-services-home",
      type: "services",
      order: 2,
      content: {
        tagline: "Our Expertise",
        heading: "Comprehensive Solutions for Your Business",
        description:
          "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape.",
      },
    },
    { id: "section-techstack-home", type: "techstack", order: 3, content: {} },
    {
      id: "section-projects-home",
      type: "projects",
      order: 4,
      content: {
        tagline: "Selected Works",
        heading: "Transforming Visions into Digital Reality",
        limit: 6,
        showViewAll: true,
      },
    },
    { id: "section-feedback-home", type: "feedback", order: 5, content: {} },
    {
      id: "section-team-home",
      type: "team",
      order: 6,
      content: {
        tagline: "Our Team",
        heading: "The Minds Behind karmakoders",
      },
    },
    {
      id: "section-faq-home",
      type: "faq",
      order: 7,
      content: {
        tagline: "FAQ",
        heading: "Common Questions",
        faqs: DEFAULT_FAQS,
      },
    },
    {
      id: "section-contact-home",
      type: "contact",
      order: 8,
      content: {
        tagline: "Get in Touch",
        heading: "Start Your Project Today",
        description: "Have an idea or project in mind? Reach out and let's build the future together.",
      },
    },
  ],
  about: [
    {
      id: "section-about-main",
      type: "about",
      order: 0,
      content: {
        tagline: "About Us",
        heading: "The Minds Behind karmakoders",
        body: "We are a team of passionate designers and engineers building premium digital experiences powered by AI.",
      },
    },
    {
      id: "section-about-team",
      type: "team",
      order: 1,
      content: {
        tagline: "Our Team",
        heading: "Meet the Experts",
      },
    },
    {
      id: "section-about-testimonials",
      type: "testimonials",
      order: 2,
      content: {
        tagline: "Testimonials",
        heading: "What Our Clients Say",
      },
    },
  ],
  services: [
    {
      id: "section-services-main",
      type: "services",
      order: 0,
      content: {
        tagline: "Our Expertise",
        heading: "Comprehensive Solutions for Your Business",
        description:
          "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape.",
      },
    },
  ],
  portfolio: [
    {
      id: "section-portfolio-projects",
      type: "projects",
      order: 0,
      content: {
        tagline: "Selected Works",
        heading: "Transforming Visions into Digital Reality",
        limit: 4,
        showViewAll: true,
      },
    },
    {
      id: "section-portfolio-casestudies",
      type: "casestudies",
      order: 1,
      content: {
        tagline: "Case Studies",
        heading: "Success Stories",
        limit: 2,
        showViewAll: true,
      },
    },
  ],
  pricing: [
    {
      id: "section-pricing-main",
      type: "pricing",
      order: 0,
      content: {
        tagline: "Pricing Architecture",
        heading: "Invest in Your Digital Dominance",
        plans: DEFAULT_PRICING_PLANS,
      },
    },
    {
      id: "section-pricing-faq",
      type: "faq",
      order: 1,
      content: {
        tagline: "FAQ",
        heading: "Common Questions",
        faqs: DEFAULT_FAQS,
      },
    },
  ],
  blog: [
    {
      id: "section-blog-main",
      type: "blog",
      order: 0,
      content: {
        tagline: "Insights",
        heading: "Explore Our Latest Thinking",
        limit: 6,
        showViewAll: false,
      },
    },
  ],
  careers: [
    {
      id: "section-careers-main",
      type: "careers",
      order: 0,
      content: {
        tagline: "Careers",
        heading: "Join Our Team",
        description:
          "We are always looking for passionate, driven individuals to help us build the future. Explore our open positions below.",
      },
    },
  ],
  contact: [
    {
      id: "section-contact-main",
      type: "contact",
      order: 0,
      content: {
        tagline: "Start Your Journey",
        heading: "Ready to Build Something Amazing?",
        description:
          "Fill out the form below and our team will get back to you within 24 hours to discuss your project idea.",
      },
    },
  ],
  "case-studies": [
    {
      id: "section-casestudies-main",
      type: "casestudies",
      order: 0,
      content: {
        tagline: "Success Stories",
        heading: "Transformation in Action",
        limit: 0,
        showViewAll: false,
      },
    },
  ],
  "help-center": [contentSection("help-center", "Help Center")],
  terms: [contentSection("terms", "Terms of Service")],
  privacy: [contentSection("privacy", "Privacy Policy")],
  "cookie-policy": [contentSection("cookie-policy", "Cookie Policy")],
  "contact-support": [contentSection("contact-support", "Contact Support")],
};

export function getDefaultSectionsForSlug(slug: string): DefaultSection[] {
  if (PAGE_SECTION_DEFAULTS[slug]) {
    return PAGE_SECTION_DEFAULTS[slug];
  }

  const sitePage = SITE_PAGES.find((p) => p.slug === slug);
  if (sitePage) {
    return [contentSection(slug, sitePage.title)];
  }

  return [];
}

export function cloneDefaultSections(slug: string): DefaultSection[] {
  return getDefaultSectionsForSlug(slug).map((s) => ({
    ...s,
    content: JSON.parse(JSON.stringify(s.content)),
  }));
}

/** All slugs that have bootstrap layouts (every SITE_PAGES entry). */
export function getAllBootstrapSlugs(): string[] {
  return SITE_PAGES.map((p) => p.slug);
}
