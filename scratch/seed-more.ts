import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  console.log("🌱 Starting supplemental seeding...");

  // 1. Seed Job Openings
  const jobCount = await prisma.jobOpening.count();
  if (jobCount === 0) {
    console.log("💼 Seeding premium Job Openings...");
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
        location: "Remote / London",
        type: "Full-time",
        description: `<h3>About the Role</h3><p>Join us to craft immersive 3D/WebGL experiences and premium React layouts. You will lead the development of high-performance interfaces that combine cutting-edge technology with award-winning design.</p><h3>Requirements</h3><ul><li>4+ years of React and Next.js experience</li><li>Strong understanding of Three.js / React Three Fiber or shaders</li><li>Obsession with animations, framerate optimization, and layout micro-interactions</li></ul>`,
        isActive: true,
      },
      {
        title: "Principal Product Designer",
        slug: "principal-product-designer",
        department: "Creative Design",
        location: "Remote / NY",
        type: "Full-time",
        description: `<h3>About the Role</h3><p>We are looking for a Principal Product Designer to redefine digital-first branding and design systems. You will collaborate directly with founders to create dark-mode glassmorphic layouts and interactive prototypes.</p><h3>Requirements</h3><ul><li>Figma mastery and strong brand aesthetic</li><li>Experience designing high-end dashboards, 3D portfolios, or SaaS landing pages</li><li>Basic understanding of CSS variables and animation principles</li></ul>`,
        isActive: true,
      },
    ];

    for (const job of jobs) {
      await prisma.jobOpening.upsert({
        where: { slug: job.slug },
        update: {},
        create: job,
      });
    }
    console.log("✅ Successfully seeded 3 Job Openings.");
  } else {
    console.log(`JobOpenings already populated (${jobCount} items). Skipping.`);
  }

  // 2. Seed Case Studies in Post model
  const caseStudyCount = await prisma.post.count({ where: { type: "case-study" } });
  if (caseStudyCount === 0) {
    console.log("📝 Seeding premium Case Studies...");
    const caseStudies = [
      {
        title: "Revolutionizing Fintech UX",
        slug: "revolutionizing-fintech-ux",
        excerpt: "How we redesigned Quantum Pay's user experience, achieving +240% increase in checkout engagement.",
        category: "Fintech",
        author: "Maya Patel",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
        type: "case-study",
        published: true,
        content: "In-depth breakdown of our UX redesign process, moving Quantum Pay from a standard transaction grid to a fully animated WebGL payment canvas with spatial audio and biometric flow shortcuts.",
      },
      {
        title: "AI-Driven Health Diagnostics",
        slug: "ai-driven-health-diagnostics",
        excerpt: "Connecting patients with specialists in under 60 seconds with an integrated 99.9% accurate AI symptoms triage.",
        category: "Healthcare",
        author: "Alex Rivera",
        image: "https://images.unsplash.com/photo-1504868584819-f8eec0421d50?auto=format&fit=crop&q=80&w=800",
        type: "case-study",
        published: true,
        content: "Comprehensive overview of how we engineered a custom WebRTC platform for Nova Health featuring client-side TensorFlow models that securely triage health alerts before routing to matching practitioners.",
      },
    ];

    for (const cs of caseStudies) {
      await prisma.post.upsert({
        where: { slug: cs.slug },
        update: {},
        create: cs,
      });
    }
    console.log("✅ Successfully seeded 2 Case Studies.");
  } else {
    console.log(`Case Studies already populated (${caseStudyCount} items). Skipping.`);
  }

  console.log("🎉 Supplemental seeding complete!");
}

main()
  .catch(console.error);
