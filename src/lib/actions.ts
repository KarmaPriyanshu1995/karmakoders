"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { LEGACY_PAGE_SLUGS, SITE_PAGES } from "@/lib/sitePages";

// ─── Page Actions ─────────────────────────────────────────────────────────────

export async function syncSitePages() {
  const existingPages = await prisma.page.findMany({
    select: { id: true, slug: true, title: true }
  });
  const existingMap = new Map(existingPages.map((p) => [p.slug, p]));

  for (const [legacySlug, canonicalSlug] of Object.entries(LEGACY_PAGE_SLUGS)) {
    const legacyPage = existingMap.get(legacySlug);
    if (!legacyPage) continue;

    const canonicalPage = existingMap.get(canonicalSlug);
    if (canonicalPage) {
      await prisma.section.updateMany({
        where: { pageId: legacyPage.id },
        data: { pageId: canonicalPage.id },
      });
      await prisma.page.delete({ where: { id: legacyPage.id } });
    } else {
      await prisma.page.update({
        where: { id: legacyPage.id },
        data: { slug: canonicalSlug, title: legacyPage.title || canonicalSlug },
      });
    }
  }

  for (const sitePage of SITE_PAGES) {
    const existing = existingMap.get(sitePage.slug);

    if (!existing) {
      const seoMeta = sitePage.defaultMeta
        ? JSON.stringify({
            title: sitePage.defaultMeta.title,
            description: sitePage.defaultMeta.description,
          })
        : undefined;

      await prisma.page.create({
        data: {
          slug: sitePage.slug,
          title: sitePage.title,
          isPublished: true,
          ...(seoMeta ? { seoMeta } : {}),
        },
      });
    } else if (existing.title !== sitePage.title) {
      await prisma.page.update({
        where: { id: existing.id },
        data: { title: sitePage.title },
      });
    }
  }
}

export async function getPages() {
  await syncSitePages();
  return prisma.page.findMany({
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { title: "asc" },
  });
}

export async function createPage(data: { slug: string; title: string }) {
  const page = await prisma.page.create({ data });
  revalidatePath("/admin/pages");
  return page;
}

export async function updatePagePublished(id: string, isPublished: boolean) {
  await prisma.page.update({ where: { id }, data: { isPublished } });
  revalidatePath("/admin/pages");
}

export async function deletePage(id: string) {
  await prisma.page.delete({ where: { id } });
  revalidatePath("/admin/pages");
}

// ─── Section Actions ───────────────────────────────────────────────────────────

export async function upsertSections(
  pageId: string,
  sections: { id: string; type: string; content: object; order: number }[]
) {
  // Delete removed sections first
  const incomingIds = sections.map((s) => s.id);
  await prisma.section.deleteMany({
    where: { pageId, id: { notIn: incomingIds } },
  });

  // Upsert all incoming sections
  for (const section of sections) {
    await prisma.section.upsert({
      where: { id: section.id },
      update: { type: section.type, content: JSON.stringify(section.content), order: section.order },
      create: {
        id: section.id,
        pageId,
        type: section.type,
        content: JSON.stringify(section.content),
        order: section.order,
      },
    });
  }
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/");
}

// ─── SiteConfig Actions ────────────────────────────────────────────────────────

export async function getSiteConfig(key: string) {
  const record = await prisma.siteConfig.findUnique({ where: { key } });
  return record ? JSON.parse(record.value) : null;
}

export async function setSiteConfig(key: string, value: object) {
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
  revalidatePath("/");
  revalidatePath("/admin");
}

// ─── Contact Actions ───────────────────────────────────────────────────────────

export async function submitContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  return prisma.contactSubmission.create({ data });
}

export async function getContactSubmissions() {
  return prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// ─── Newsletter Actions ────────────────────────────────────────────────────────

export async function subscribeNewsletter(email: string) {
  return prisma.newsletterSubscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
}

// ─── Blog Actions ─────────────────────────────────────────────────────────────

export async function getPosts(type?: string) {
  return prisma.post.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getCaseStudies() {
  return getPosts("case-study");
}

export async function getPostBySlug(slug: string) {
  return prisma.post.findUnique({
    where: { slug },
  });
}

export async function upsertPost(data: {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  image?: string;
  category?: string;
  author?: string;
  type?: string;
  published: boolean;
}) {
  const { id, ...postData } = data;
  const post = await prisma.post.upsert({
    where: { id: id || "new-id" },
    update: postData,
    create: postData,
  });
  revalidatePath("/blog");
  revalidatePath("/portfolio");
  revalidatePath("/admin/blog");
  return post;
}

export async function deletePost(id: string) {
  await prisma.post.delete({ where: { id } });
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
}

// ─── Project Actions ──────────────────────────────────────────────────────────

export async function getProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
  });
}

export async function upsertProject(data: {
  id?: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  content: string;
  link?: string;
  tags: string;
}) {
  const { id, ...projectData } = data;
  const project = await prisma.project.upsert({
    where: { id: id || "new-id" },
    update: projectData,
    create: projectData,
  });
  revalidatePath("/portfolio");
  revalidatePath("/admin/projects");
  return project;
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/portfolio");
  revalidatePath("/admin/projects");
}

// ─── Career Actions ──────────────────────────────────────────────────────────

export async function getJobs() {
  return prisma.jobOpening.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { applications: true }
      }
    }
  });
}

export async function getJobBySlug(slug: string) {
  return prisma.jobOpening.findUnique({
    where: { slug },
  });
}

export async function upsertJob(data: {
  id?: string;
  title: string;
  slug: string;
  department?: string;
  location?: string;
  type: string;
  description: string;
  isActive: boolean;
}) {
  const { id, ...jobData } = data;
  const job = await prisma.jobOpening.upsert({
    where: { id: id || "new-id" },
    update: jobData,
    create: jobData,
  });
  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return job;
}

export async function deleteJob(id: string) {
  await prisma.jobOpening.delete({ where: { id } });
  revalidatePath("/careers");
  revalidatePath("/admin/careers");
}

export async function submitJobApplication(data: {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  portfolio?: string;
  cvUrl: string;
  coverLetter?: string;
}) {
  return prisma.jobApplication.create({ data });
}

export async function getJobApplications(jobId?: string) {
  return prisma.jobApplication.findMany({
    where: jobId ? { jobId } : undefined,
    include: {
      job: { select: { title: true } }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateApplicationStatus(id: string, status: string) {
  await prisma.jobApplication.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/careers/applications");
}

export async function deleteJobApplication(id: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id }
  });

  if (application && application.cvUrl) {
    const fileKey = application.cvUrl.split("/").pop();
    if (fileKey) {
      try {
        const utapi = new UTApi();
        await utapi.deleteFiles(fileKey);
      } catch (error) {
        console.error("Failed to delete file from UploadThing:", error);
      }
    }
  }

  await prisma.jobApplication.delete({
    where: { id }
  });

  revalidatePath("/admin/careers/applications");
}

// ─── Database Seeding & Recovery Actions ─────────────────────────────────────

export async function seedDatabase(type: "sections" | "all") {
  // 1. Create or upsert "/" page
  const homePage = await prisma.page.upsert({
    where: { slug: "/" },
    update: { isPublished: true },
    create: { slug: "/", title: "Home", isPublished: true },
  });

  // 2. Define homepage sections content
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
        heading: "The Minds Behind karmakoders",
        team: [
          {
            name: "Ethan Walker",
            role: "Founder & CEO at KarmaKoders | Mobile App Developer | AI & SaaS Consultant | Helping Startups Scale with Technology",
            image: "/ethan-walker.jpg"
          }
        ]
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

  // 3. Seed site config default themes
  await prisma.siteConfig.upsert({
    where: { key: "globalTheme" },
    update: {},
    create: {
      key: "globalTheme",
      // value: JSON.stringify({
      //   mode: "dark",
      //   theme: "dark",
      //   bgType: "solid",
      //   bgColor: "#252422",
      //   textColor: "#ffffff",
      //   primaryColor: "#FFC300",
      // }),
      value: JSON.stringify({
        mode: "light",
        theme: "light",
        bgType: "solid",
        bgColor: "#fafafaff",
        textColor: "#ffffff",
        primaryColor: "#FFC300",
      }),
    },
  });

  if (type === "all") {
    // 4. Seed Projects
    const { DEFAULT_PROJECTS } = await import("@/lib/constants");
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

    // 5. Seed Blogs & Case Studies
    const { DEFAULT_POSTS } = await import("@/lib/constants");
    for (const post of DEFAULT_POSTS) {
      await prisma.post.upsert({
        where: { slug: post.slug },
        update: {},
        create: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          image: post.image,
          category: post.category,
          author: post.author,
          published: true,
        },
      });
    }

    // Seed supplemental case studies
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

    // 6. Seed Job Openings
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
  }

  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/blog");
  revalidatePath("/careers");
  revalidatePath("/admin/pages");
  return { success: true };
}
