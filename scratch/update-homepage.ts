import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("🌱 Setting up homepage sections in database...");

  // Find or create the Home Page
  const homePage = await prisma.page.upsert({
    where: { slug: "/" },
    update: { isPublished: true },
    create: { slug: "/", title: "Home", isPublished: true },
  });

  // Define homepage sections with their types and content configs
  const sections = [
    {
      id: "section-hero-home",
      type: "hero",
      order: 0,
      content: {
        headline: "Design the Future of Your Brand",
        subheadline: "We build premium, scalable, and immersive web platforms powered by advanced AI and cutting-edge 3D technologies.",
        ctaPrimary: "Explore Portfolio",
        ctaSecondary: "Our Services"
      }
    },
    {
      id: "section-partners-home",
      type: "partners",
      order: 1,
      content: {}
    },
    {
      id: "section-services-home",
      type: "services",
      order: 2,
      content: {
        tagline: "Our Expertise",
        heading: "Comprehensive Solutions for Your Business",
        description: "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape."
      }
    },
    {
      id: "section-techstack-home",
      type: "techstack",
      order: 3,
      content: {}
    },
    {
      id: "section-projects-home",
      type: "projects",
      order: 4,
      content: {
        tagline: "Selected Works",
        heading: "Transforming Visions into Digital Reality",
        limit: 6,
        showViewAll: true
      }
    },
    {
      id: "section-feedback-home",
      type: "feedback",
      order: 5,
      content: {}
    },
    {
      id: "section-team-home",
      type: "team",
      order: 6,
      content: {
        tagline: "Our Team",
        heading: "The Minds Behind karmakoders"
      }
    },
    {
      id: "section-faq-home",
      type: "faq",
      order: 7,
      content: {
        tagline: "FAQ",
        heading: "Common Questions"
      }
    },
    {
      id: "section-contact-home",
      type: "contact",
      order: 8,
      content: {
        tagline: "Get in Touch",
        heading: "Start Your Project Today",
        description: "Have an idea or project in mind? Reach out and let's build the future together."
      }
    }
  ];

  for (const s of sections) {
    await prisma.section.upsert({
      where: { id: s.id },
      update: {
        type: s.type,
        order: s.order,
        content: JSON.stringify(s.content)
      },
      create: {
        id: s.id,
        pageId: homePage.id,
        type: s.type,
        order: s.order,
        content: JSON.stringify(s.content)
      }
    });
  }

  console.log("✅ Successfully seeded all homepage sections.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
