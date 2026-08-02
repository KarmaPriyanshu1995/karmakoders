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
  console.log("🛠️ Starting database update for homepage sections and SEO schemas...");

  // 1. Retrieve the Home page ID
  const homePage = await prisma.page.findUnique({
    where: { slug: "home" },
  });

  if (!homePage) {
    throw new Error("❌ Home page record not found in the database. Please run the main seed script first.");
  }

  const pageId = homePage.id;
  console.log(`🏠 Found Home Page ID: ${pageId}`);

  // 2. Clear existing homepage sections in DB to prevent duplicates or orphaned entries
  console.log("🧹 Clearing old homepage sections...");
  await prisma.section.deleteMany({
    where: { pageId },
  });

  // 3. Load defaults and seed new 12 sections
  console.log("🌱 Seeding 12 homepage sections in order...");
  const { PAGE_SECTION_DEFAULTS } = await import("../src/lib/sectionDefaults");
  const homeSections = PAGE_SECTION_DEFAULTS.home;

  for (const s of homeSections) {
    await prisma.section.create({
      data: {
        id: s.id,
        pageId,
        type: s.type,
        order: s.order,
        content: JSON.stringify(s.content),
      },
    });
    console.log(`   ✅ Inserted section: ${s.type} (order: ${s.order})`);
  }

  // 4. Update the page-level SEO metadata for Home page
  console.log("📈 Updating Home page SEO Meta values...");
  const seoMeta = {
    title: "karmakoders — Enterprise Software Development Partner",
    description: "Premium software development company. We engineer custom web systems, SaaS platforms, native mobile apps, and AI integrations for the US market. NDA-friendly.",
  };
  await prisma.page.update({
    where: { id: pageId },
    data: {
      seoMeta: JSON.stringify(seoMeta),
    },
  });

  // 5. Seed SEO schemas (JSON-LD)
  console.log("🧩 Seeding Enterprise JSON-LD schemas (Organization, LocalBusiness, Service, FAQPage, WebSite, WebPage)...");

  // Clear existing schemas for home
  await prisma.seoSchema.deleteMany({
    where: { pageId, pageType: "page" },
  });

  const SITE_URL = "https://www.karmakoders.com";

  // Organization Schema
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    "name": "karmakoders",
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "email": "info@karmakoders.com",
    "description": "Premium software development company specializing in Next.js web applications, mobile apps, AI solutions, and custom SaaS platforms.",
    "sameAs": [
      "https://github.com/karmakoders",
      "https://twitter.com/karmakoders"
    ]
  };

  // LocalBusiness Schema
  // TODO: Replace placeholders below with actual business coordinates/address/phone
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    "name": "karmakoders",
    "image": `${SITE_URL}/logo.png`,
    "url": SITE_URL,
    "telephone": "+1-800-555-0199",
    "email": "info@karmakoders.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1209 Orange Street",
      "addressLocality": "Wilmington",
      "addressRegion": "DE",
      "postalCode": "19801",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 39.7456,
      "longitude": -75.5507
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "18:00"
    }
  };

  // Service Schema
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/#service-software`,
    "name": "Custom Software Development",
    "provider": {
      "@id": `${SITE_URL}/#organization`
    },
    "description": "Enterprise-grade custom software, SaaS, mobile app, and AI development services designed for performance, security, and scalability.",
    "areaServed": ["US", "CA", "GB", "EU"],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Software Development Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Web Application Engineering"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Mobile App Development"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "AI Solutions & Integration"
          }
        }
      ]
    }
  };

  // FAQPage Schema
  const faqSchema = {
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
      }
    ]
  };

  // WebSite Schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    "url": SITE_URL,
    "name": "karmakoders",
    "publisher": {
      "@id": `${SITE_URL}/#organization`
    }
  };

  // WebPage Schema
  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    "url": SITE_URL,
    "name": "KarmaKoders Homepage - Enterprise Software Development Partner",
    "isPartOf": {
      "@id": `${SITE_URL}/#website`
    },
    "about": {
      "@id": `${SITE_URL}/#organization`
    },
    "description": "Enterprise software engineering agency homepage. Discover why US businesses trust KarmaKoders to build scalable SaaS, mobile app, and AI integrations."
  };

  const schemasToInsert = [
    { type: "Organization", data: orgSchema },
    { type: "LocalBusiness", data: localBusinessSchema },
    { type: "Service", data: serviceSchema },
    { type: "FAQPage", data: faqSchema },
    { type: "WebSite", data: websiteSchema },
    { type: "WebPage", data: webpageSchema },
  ];

  for (const s of schemasToInsert) {
    await prisma.seoSchema.create({
      data: {
        pageType: "page",
        pageId,
        schemaType: s.type,
        schemaJson: JSON.stringify(s.data),
        isApplied: true,
      },
    });
    console.log(`   ✅ Inserted SEO Schema: ${s.type}`);
  }

  console.log("🎉 Database homepage sections and schemas update completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding script encountered an error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
