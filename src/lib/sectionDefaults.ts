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
    question: "How do you coordinate with USA and Canada time zones?",
    answer: "We ensure full daily overlap during your active working hours. Our dedicated Project Managers and lead engineers host daily stand-ups and sprint reviews during EST/PST times. All communication is maintained on Slack, Teams, or Jira for instant accessibility.",
  },
  {
    question: "Do you sign NDAs before discussing project scope?",
    answer: "Absolutely. We require mutual or unilateral NDAs before any technical scoping, code audits, or system design discussions take place. Your brand security and IP are protected from day one.",
  },
  {
    question: "How is intellectual property and code ownership handled?",
    answer: "Once a milestone is delivered and signed off, 100% of the intellectual property, repository access, and code assets are legally transferred to your company under Delaware law.",
  },
  {
    question: "What compliance standards and security controls do you follow?",
    answer: "We develop all projects using compliance-first engineering. We build to satisfy SOC 2 Type II controls, HIPAA standards for healthcare systems, GDPR & CCPA for global user privacy, and PCI-DSS rules for custom checkouts.",
  },
  {
    question: "What is your typical project velocity and sprint schedule?",
    answer: "We operate on bi-weekly agile sprints. At the end of every 2 weeks, we host a sprint review showcasing functioning software on staging environments. This ensures continuous feedback and rapid iteration with zero surprises.",
  },
  {
    question: "How does billing work and do you support USD payments?",
    answer: "All contracts are executed in USD and processed via secure invoicing. We offer flexible options, including fixed-price scopes for validated MVPs and dedicated monthly engineer retainers for growing SaaS platforms.",
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
        badge: "Trusted Development Partner",
        headline: "Enterprise Software Engineering",
        highlight: "Built for the US Market.",
        subheadline: "We design, engineer, and scale high-performance web, mobile, and AI solutions. Full timezone overlap, NDA-friendly collaboration, and transparent USD pricing.",
        ctaPrimary: "Book Discovery Call",
        ctaSecondary: "Get Free Estimate",
      },
    },
    {
      id: "section-whychoosekarmakoders-home",
      type: "whychoosekarmakoders",
      order: 1,
      content: {
        tagline: "Why Choose KarmaKoders",
        heading: "Why Businesses Choose KarmaKoders",
        subtitle: "We combine modern engineering, transparent collaboration, and scalable technology to help businesses build digital products with confidence.",
      },
    },
    { id: "section-partners-home", type: "partners", order: 2, content: {} },
    {
      id: "section-services-home",
      type: "services",
      order: 3,
      content: {
        tagline: "Our Expertise",
        heading: "Comprehensive Solutions for Your Business",
        description: "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape.",
      },
    },
    {
      id: "section-industries-home",
      type: "industries",
      order: 4,
      content: {
        tagline: "Industries We Serve",
        heading: "Built for Industries That Move Fast",
        subheading: "From fintech to healthcare, we engineer digital products for industries where reliability matters.",
      },
    },
    {
      id: "section-projects-home",
      type: "projects",
      order: 5,
      content: {
        tagline: "Case Studies",
        heading: "Real Results for Real Businesses",
        limit: 6,
        showViewAll: true,
      },
    },
    { id: "section-techstack-home", type: "techstack", order: 6, content: {} },
    {
      id: "section-chooseus-home",
      type: "chooseus",
      order: 7,
      content: {
        tagline: "Why Choose KarmaKoders",
        heading: "Built for the US Market. Engineered Without Compromise.",
      },
    },
    {
      id: "section-engagement-home",
      type: "engagement",
      order: 8,
      content: {
        tagline: "Engagement Models",
        heading: "Flexible Frameworks for Scaling Teams",
        subheading: "Choose a structured collaboration model designed to fit your project scope, timeline, and compliance needs.",
      },
    },
    {
      id: "section-process-home",
      type: "process",
      order: 9,
      content: {
        tagline: "Our Methodology",
        heading: "How We Build Successful Products",
      },
    },
    {
      id: "section-faq-home",
      type: "faq",
      order: 10,
      content: {
        tagline: "FAQ",
        heading: "Frequently Asked Questions",
        faqs: DEFAULT_FAQS,
      },
    },
    {
      id: "section-contact-home",
      type: "contact",
      order: 11,
      content: {
        tagline: "Start Your Project",
        heading: "Ready to Scale Your Digital Product?",
        description: "Book a discovery call or request a free project scoping estimate. Get a response from a senior systems architect in less than 12 hours.",
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
  "cookie-policy": [contentSection("cookie-policy", "Cookie Policy", `
    <div class="prose prose-invert max-w-none">
      <p>Last updated: August 2, 2026</p>
      <p>At KarmaKoders, we believe in being clear and open about how we collect and use data related to you. This Cookie Policy applies to any KarmaKoders product or service that links to this policy or incorporates it by reference.</p>
      <h3>How We Use Cookies</h3>
      <p>We use cookies and other tracking technologies to ensure you get the best experience on our website, analyze site traffic, and assist with our marketing efforts. Some cookies are necessary for core security and functionality, while others help us improve performance and personalize your journey.</p>
      <h3>Types of Cookies We Use</h3>
      <ul>
        <li><strong>Necessary Cookies:</strong> These cookies are essential to enable you to move around our website and use its features securely.</li>
        <li><strong>Performance & Analytics Cookies:</strong> These cookies help us understand how visitors interact with our website by collecting information anonymously, helping us improve custom software development workflows.</li>
        <li><strong>Functional Cookies:</strong> These cookies allow our website to remember choices you make (such as your login details or language preference) to provide an enhanced experience.</li>
      </ul>
      <h3>Managing Your Preferences</h3>
      <p>You can manage or disable cookies at any time through your web browser settings. Please note that disabling certain cookies may affect your experience and limit the functionality of some website features.</p>
    </div>
  `)],
  "refund-policy": [contentSection("refund-policy", "Refund Policy", `
    <div class="prose prose-invert max-w-none">
      <p>Last updated: August 2, 2026</p>
      <p>At KarmaKoders, we stand behind the quality of our engineering and digital product development. Because we work under Delaware law and contract on milestone-based clear delivery scopes, we outline our refund terms below to ensure complete transparency.</p>
      <h3>Milestone-Based Billing</h3>
      <p>All custom software development, mobile app development, and AI solutions are scoped in bi-weekly sprint milestones. Once a milestone is signed off and delivered to staging or production, the work is considered accepted and the corresponding payment is non-refundable.</p>
      <h3>Cancellation & Refund Requests</h3>
      <p>If you choose to terminate a project before a milestone starts, any pre-paid amounts for future unstarted milestones will be fully refunded to your US bank account within 14 business days.</p>
      <h3>Contact Us</h3>
      <p>For any questions regarding billing or refund requests, please reach out directly to our billing support department at billing@karmakoders.com.</p>
    </div>
  `)],
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
