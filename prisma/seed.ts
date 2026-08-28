import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "karmakoders" },
    update: {},
    create: { id: "default-tenant-karmakoders", name: "KarmaKoders", slug: "karmakoders", isPrimary: true },
  });
  const tenantId = tenant.id;

  // Default Theme Config
  await prisma.siteConfig.upsert({
    where: { tenantId_key: { tenantId, key: "theme" } },
    update: {},
    create: {
      tenantId,
      key: "theme",
      value: JSON.stringify({
        colors: { primary: "#4f46e5", secondary: "#06b6d4", background: "#020617" },
        typography: { heading: "Inter", body: "Inter" },
      }),
    },
  });

  // Default SEO Config
  await prisma.siteConfig.upsert({
    where: { tenantId_key: { tenantId, key: "seoMeta" } },
    update: {},
    create: {
      tenantId,
      key: "seoMeta",
      value: JSON.stringify({
        title: "karmakoders – Premium AI Business Portfolio",
        description: "We build premium, scalable, and immersive web platforms powered by AI.",
        keywords: ["AI", "portfolio", "web design", "nextjs"],
      }),
    },
  });

  const { SITE_PAGES } = await import("../src/lib/sitePages");

  for (const sitePage of SITE_PAGES) {
    const seoMeta = sitePage.defaultMeta
      ? JSON.stringify({
          title: sitePage.defaultMeta.title,
          description: sitePage.defaultMeta.description,
        })
      : undefined;
    const page = await prisma.page.upsert({
      where: { slug: sitePage.slug },
      update: { title: sitePage.title, isPublished: true, ...(seoMeta ? { seoMeta } : {}) },
      create: {
        slug: sitePage.slug,
        title: sitePage.title,
        isPublished: true,
        ...(seoMeta ? { seoMeta } : {}),
      },
    });

    const { getDefaultSectionsForSlug } = await import("../src/lib/sectionDefaults");
    const defaultSections = getDefaultSectionsForSlug(sitePage.slug);
    for (const section of defaultSections) {
      await prisma.section.upsert({
        where: { id: section.id },
        update: {
          content: JSON.stringify(section.content),
          order: section.order,
        },
        create: {
          id: section.id,
          pageId: page.id,
          type: section.type,
          order: section.order,
          content: JSON.stringify(section.content),
        },
      });
    }

    // Prune any deprecated sections not in defaults
    const defaultSectionIds = defaultSections.map((s) => s.id);
    await prisma.section.deleteMany({
      where: {
        pageId: page.id,
        id: { notIn: defaultSectionIds },
      },
    });
  }

  // Seed Blog Posts
  console.log("📝 Seeding blog posts...");
  const { DEFAULT_POSTS, DEFAULT_PROJECTS } = await import("../src/lib/constants");
  for (const post of DEFAULT_POSTS) {
    const defaultPostMeta = JSON.stringify({
      title: `${post.title} | karmakoders Blog`,
      description: post.excerpt || `${post.title} - Read the latest articles and insights from the team at karmakoders.`,
    });
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: { seoMeta: defaultPostMeta },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        image: post.image,
        category: post.category,
        author: post.author,
        published: true,
        seoMeta: defaultPostMeta,
      },
    });
  }

  // Seed Projects
  console.log("🚀 Seeding projects...");
  for (const project of DEFAULT_PROJECTS) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {},
      create: {
        title: project.title,
        slug: project.slug,
        description: project.description,
        imageUrl: project.image,
        content: project.content,
        tags: project.tags,
        link: project.link,
      },
    });
  }

  // Seed schemas
  console.log("🧩 Seeding default SEO schemas...");
  const homePage = await prisma.page.findUnique({ where: { slug: "home" } });
  const servicesPage = await prisma.page.findUnique({ where: { slug: "services" } });

  if (homePage) {
    const existingOrg = await prisma.seoSchema.findFirst({
      where: { pageId: homePage.id, schemaType: "Organization" }
    });
    const orgData = {
      pageType: "page",
      pageId: homePage.id,
      schemaType: "Organization",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://www.karmakoders.com/#organization",
        "name": "karmakoders",
        "url": "https://www.karmakoders.com",
        "logo": "https://www.karmakoders.com/logo.png",
        "email": "info@karmakoders.com",
        "sameAs": [
          "https://github.com/karmakoders",
          "https://twitter.com/karmakoders"
        ]
      }),
      isApplied: true,
    };
    if (existingOrg) {
      await prisma.seoSchema.update({ where: { id: existingOrg.id }, data: orgData });
    } else {
      await prisma.seoSchema.create({ data: orgData });
    }

    const existingFaq = await prisma.seoSchema.findFirst({
      where: { pageId: homePage.id, schemaType: "FAQPage" }
    });
    const faqData = {
      pageType: "page",
      pageId: homePage.id,
      schemaType: "FAQPage",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How long does a typical project take?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Project timelines vary depending on complexity. A standard landing page takes about 2-3 weeks, while complex platforms can take 2-4 months."
            }
          },
          {
            "@type": "Question",
            "name": "What industries do you specialize in?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We have experience across fintech, healthcare, e-commerce, real estate, and entertainment."
            }
          },
          {
            "@type": "Question",
            "name": "Do you offer post-launch support?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we provide tiered maintenance and support packages to ensure your platform remains secure and up-to-date."
            }
          }
        ]
      }),
      isApplied: true,
    };
    if (existingFaq) {
      await prisma.seoSchema.update({ where: { id: existingFaq.id }, data: faqData });
    } else {
      await prisma.seoSchema.create({ data: faqData });
    }
  }

  if (servicesPage) {
    const existingService = await prisma.seoSchema.findFirst({
      where: { pageId: servicesPage.id, schemaType: "Service" }
    });
    const serviceData = {
      pageType: "page",
      pageId: servicesPage.id,
      schemaType: "Service",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Software Development Services",
        "provider": {
          "@type": "Organization",
          "name": "karmakoders",
          "url": "https://www.karmakoders.com",
          "logo": "https://www.karmakoders.com/logo.png"
        },
        "description": "Premium software engineering, custom SaaS development, mobile applications, and AI integrations for founders and scaling startups.",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Software Engineering Services",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Custom Software Development",
                "description": "Enterprise-grade bespoke software systems designed to solve complex business operations with robust architectures and absolute data safety."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Mobile App Development",
                "description": "Native iOS and Android mobile solutions engineered for smooth performance, high offline accessibility, and interactive design layouts."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "AI Solutions & Integrations",
                "description": "Integrate LLMs, neural searches, custom machine learning pipelines, and autonomous agentic workflows directly into your platform."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "SaaS Development",
                "description": "Scalable multi-tenant subscription products built on high-speed Next.js frameworks with automated billing systems and analytic setups."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Website Development",
                "description": "Premium corporate portals and headless web platforms optimized for fast loading speeds, search engine discoverability, and CRO."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "UI/UX Design & Branding",
                "description": "High-end user interfaces, comprehensive wireframing, interactive prototyping, and custom typography to capture and convert users."
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Cloud Engineering & DevOps",
                "description": "Secure, auto-scaling cloud deployments on AWS and Google Cloud with continuous automated monitoring, audits, and SLA guarantees."
              }
            }
          ]
        }
      }),
      isApplied: true,
    };
    if (existingService) {
      await prisma.seoSchema.update({ where: { id: existingService.id }, data: serviceData });
    } else {
      await prisma.seoSchema.create({ data: serviceData });
    }

    const existingServiceFaq = await prisma.seoSchema.findFirst({
      where: { pageId: servicesPage.id, schemaType: "FAQPage" }
    });
    const serviceFaqData = {
      pageType: "page",
      pageId: servicesPage.id,
      schemaType: "FAQPage",
      schemaJson: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do you coordinate with USA and Canada time zones?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We ensure full daily overlap during your active working hours. Our dedicated Project Managers and lead engineers host daily stand-ups and sprint reviews during EST/PST times. All communication is maintained on Slack, Teams, or Jira for instant accessibility."
            }
          },
          {
            "@type": "Question",
            "name": "Do you sign NDAs before discussing project scope?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely. We require mutual or unilateral NDAs before any technical scoping, code audits, or system design discussions take place. Your brand security and IP are protected from day one."
            }
          },
          {
            "@type": "Question",
            "name": "How is intellectual property and code ownership handled?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Once a milestone is delivered and signed off, 100% of the intellectual property, repository access, and code assets are legally transferred to your company under Delaware law."
            }
          },
          {
            "@type": "Question",
            "name": "What compliance standards and security controls do you follow?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We develop all projects using compliance-first engineering. We build to satisfy SOC 2 Type II controls, HIPAA standards for healthcare systems, GDPR & CCPA for global user privacy, and PCI-DSS rules for custom checkouts."
            }
          },
          {
            "@type": "Question",
            "name": "What is your typical project velocity and sprint schedule?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We operate on bi-weekly agile sprints. At the end of every 2 weeks, we host a sprint review showcasing functioning software on staging environments. This ensures continuous feedback and rapid iteration with zero surprises."
            }
          },
          {
            "@type": "Question",
            "name": "How does billing work and do you support USD payments?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "All contracts are executed in USD and processed via secure invoicing. We offer flexible options, including fixed-price scopes for validated MVPs and dedicated monthly engineer retainers for growing SaaS platforms."
            }
          }
        ]
      }),
      isApplied: true,
    };
    if (existingServiceFaq) {
      await prisma.seoSchema.update({ where: { id: existingServiceFaq.id }, data: serviceFaqData });
    } else {
      await prisma.seoSchema.create({ data: serviceFaqData });
    }
  }

  // Seed Job Openings
  console.log("💼 Seeding job openings...");
  const jobs = [
    {
      title: "Lead AI Solutions Engineer",
      slug: "lead-ai-solutions-engineer",
      department: "AI Engineering",
      location: "Remote (Global) / SF",
      type: "Full-time",
      description: `<h3>About the Role</h3><p>We are seeking a Lead AI Solutions Engineer to head our custom agent development workflows. You will design, build, and deploy fine-tuned LLM agents and orchestrate complex RAG frameworks for our luxury enterprise clients.</p><h3>Requirements</h3><ul><li>5+ years of software engineering experience</li><li>Expertise with LangChain, LlamaIndex, or raw model engineering</li><li>Proficiency in Python/TypeScript and next-generation vector stores</li></ul>`,
      isActive: true,
    },
    {
      title: "Senior Frontend Architect",
      slug: "senior-frontend-architect",
      department: "Creative Engineering",
      location: "Remote",
      type: "Full-time",
      description: `<h3>About the Role</h3><p>We are looking for a Senior Frontend Architect to lead the implementation of our premium, high-fidelity user interfaces. You will work with Next.js, Framer Motion, Three.js, and WebGL to create web applications that feel responsive, fluid, and premium.</p><h3>Requirements</h3><ul><li>5+ years of production experience with Next.js and TailwindCSS</li><li>Expertise in performance profiling, animations, and typography</li><li>Experience building responsive, accessible, and high-performance apps</li></ul>`,
      isActive: true,
    },
    {
      title: "Lead UI Designer",
      slug: "lead-ui-designer",
      department: "Design",
      location: "Remote / NY",
      type: "Full-time",
      description: `<h3>About the Role</h3><p>We are seeking an elite Lead UI Designer to define our design systems and craft premium digital products. You will collaborate with engineering to build gorgeous layouts, motion guidelines, and interactive mockups.</p><h3>Requirements</h3><ul><li>Portfolio showcasing premium brand layouts and typography</li><li>Deep expertise in Figma, design systems, and responsive layouts</li><li>Strong understanding of frontend styling (TailwindCSS/CSS)</li></ul>`,
      isActive: true,
    },
  ];

  for (const job of jobs) {
    await prisma.jobOpening.upsert({
      where: { slug: job.slug },
      update: {
        department: job.department,
        location: job.location,
        type: job.type,
        description: job.description,
        isActive: job.isActive,
      },
      create: job,
    });
  }

  try {
    const { ensureFreeToolsDefaults, seedDomainProviders } = await import("../src/lib/tools/defaults");
    await ensureFreeToolsDefaults(tenantId);
    await seedDomainProviders(tenantId);
    console.log("🛠️  Free tools defaults ensured.");
  } catch (error) {
    console.warn("Free tools seed skipped:", error instanceof Error ? error.message : error);
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
