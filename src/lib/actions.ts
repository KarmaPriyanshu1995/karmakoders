"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { LEGACY_PAGE_SLUGS, SITE_PAGES } from "@/lib/sitePages";
import { getContextualTenantId, requireTenantContext, TenantAccessError, assertOwnership } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { AUDIT_ACTIONS, logAudit } from "@/lib/audit";

// ─── Page Actions ─────────────────────────────────────────────────────────────

export async function syncSitePages(tenantId: string) {
  const existingPages = await prisma.page.findMany({
    where: { tenantId },
    select: { id: true, slug: true, title: true },
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
          tenantId,
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
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_VIEW, permissionOverrides);
  await syncSitePages(tenantId);
  return prisma.page.findMany({
    where: { tenantId },
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { title: "asc" },
  });
}

export async function createPage(data: { slug: string; title: string }) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_CREATE, permissionOverrides);
  const page = await prisma.page.create({ data: { ...data, tenantId } });
  revalidatePath("/admin/pages");
  return page;
}

export async function updatePagePublished(id: string, isPublished: boolean) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_UPDATE, permissionOverrides);
  const { count } = await prisma.page.updateMany({ where: { id, tenantId }, data: { isPublished } });
  if (count === 0) throw new TenantAccessError("Page not found");
  revalidatePath("/admin/pages");
}

export async function deletePage(id: string) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_DELETE, permissionOverrides);
  const { count } = await prisma.page.deleteMany({ where: { id, tenantId } });
  if (count === 0) throw new TenantAccessError("Page not found");
  revalidatePath("/admin/pages");
}

// ─── Section Actions ───────────────────────────────────────────────────────────

export async function upsertSections(
  pageId: string,
  sections: { id: string; type: string; content: object; order: number }[]
) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_UPDATE, permissionOverrides);

  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { tenantId: true } });
  if (!page) throw new TenantAccessError("Page not found");
  assertOwnership(page.tenantId, tenantId);

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
  const tenantId = await getContextualTenantId();
  const record = await prisma.siteConfig.findUnique({ where: { tenantId_key: { tenantId, key } } });
  return record ? JSON.parse(record.value) : null;
}

export async function setSiteConfig(key: string, value: object) {
  const { tenantId, role, user, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.SETTINGS_UPDATE, permissionOverrides);
  await prisma.siteConfig.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { value: JSON.stringify(value) },
    create: { tenantId, key, value: JSON.stringify(value) },
  });
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATED, resource: "SiteConfig", resourceId: key });
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
  const tenantId = await getContextualTenantId();
  return prisma.contactSubmission.create({ data: { ...data, tenantId } });
}

export async function getContactSubmissions() {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.INQUIRY_VIEW, permissionOverrides);
  return prisma.contactSubmission.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Newsletter Actions ────────────────────────────────────────────────────────

export async function subscribeNewsletter(email: string) {
  const tenantId = await getContextualTenantId();
  return prisma.newsletterSubscriber.upsert({
    where: { tenantId_email: { tenantId, email } },
    update: {},
    create: { tenantId, email },
  });
}

// ─── Blog Actions ─────────────────────────────────────────────────────────────

export async function getPosts(type?: string, options?: { includeDrafts?: boolean }) {
  const tenantId = await getContextualTenantId();
  const includeDrafts = options?.includeDrafts ?? false;
  return prisma.post.findMany({
    where: {
      tenantId,
      ...(type ? { type } : {}),
      ...(!includeDrafts ? { published: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCaseStudies() {
  return getPosts("case-study");
}

export async function getPostBySlug(slug: string, options?: { includeDrafts?: boolean }) {
  const tenantId = await getContextualTenantId();
  const includeDrafts = options?.includeDrafts ?? false;
  const post = await prisma.post.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
  if (!post || (!includeDrafts && !post.published)) return null;
  return post;
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
  seoMeta?: string;
}) {
  const { tenantId, role, user, permissionOverrides } = await requireTenantContext();
  const { id, ...postData } = data;

  let post;
  if (id) {
    assertPermission(role, PERMISSIONS.BLOG_UPDATE, permissionOverrides);
    const existing = await prisma.post.findUnique({ where: { id }, select: { tenantId: true } });
    if (!existing) throw new TenantAccessError("Post not found");
    assertOwnership(existing.tenantId, tenantId);
    post = await prisma.post.update({ where: { id }, data: postData });
    await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.BLOG_UPDATED, resource: "Post", resourceId: post.id });
  } else {
    assertPermission(role, PERMISSIONS.BLOG_CREATE, permissionOverrides);
    post = await prisma.post.create({ data: { ...postData, tenantId } });
    await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.BLOG_CREATED, resource: "Post", resourceId: post.id });
  }
  if (postData.published) {
    await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.BLOG_PUBLISHED, resource: "Post", resourceId: post.id });
  }

  revalidatePath("/blog");
  revalidatePath("/portfolio");
  revalidatePath("/admin/blog");
  return post;
}

export async function deletePost(id: string) {
  const { tenantId, role, user, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.BLOG_DELETE, permissionOverrides);
  const { count } = await prisma.post.deleteMany({ where: { id, tenantId } });
  if (count === 0) throw new TenantAccessError("Post not found");
  await logAudit({ tenantId, userId: user.id, action: AUDIT_ACTIONS.BLOG_DELETED, resource: "Post", resourceId: id });
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
}

// ─── Project Actions ──────────────────────────────────────────────────────────

export async function getProjects() {
  const tenantId = await getContextualTenantId();
  return prisma.project.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectBySlug(slug: string) {
  const tenantId = await getContextualTenantId();
  return prisma.project.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
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
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  const { id, ...projectData } = data;

  let project;
  if (id) {
    assertPermission(role, PERMISSIONS.PROJECT_UPDATE, permissionOverrides);
    const existing = await prisma.project.findUnique({ where: { id }, select: { tenantId: true } });
    if (!existing) throw new TenantAccessError("Project not found");
    assertOwnership(existing.tenantId, tenantId);
    project = await prisma.project.update({ where: { id }, data: projectData });
  } else {
    assertPermission(role, PERMISSIONS.PROJECT_CREATE, permissionOverrides);
    project = await prisma.project.create({ data: { ...projectData, tenantId } });
  }

  revalidatePath("/portfolio");
  revalidatePath("/admin/projects");
  return project;
}

export async function deleteProject(id: string) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PROJECT_DELETE, permissionOverrides);
  const { count } = await prisma.project.deleteMany({ where: { id, tenantId } });
  if (count === 0) throw new TenantAccessError("Project not found");
  revalidatePath("/portfolio");
  revalidatePath("/admin/projects");
}

// ─── Career Actions ──────────────────────────────────────────────────────────

export async function getJobs() {
  const tenantId = await getContextualTenantId();
  return prisma.jobOpening.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });
}

export async function getJobBySlug(slug: string) {
  const tenantId = await getContextualTenantId();
  return prisma.jobOpening.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
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
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  const { id, ...jobData } = data;

  let job;
  if (id) {
    assertPermission(role, PERMISSIONS.CAREER_UPDATE, permissionOverrides);
    const existing = await prisma.jobOpening.findUnique({ where: { id }, select: { tenantId: true } });
    if (!existing) throw new TenantAccessError("Job opening not found");
    assertOwnership(existing.tenantId, tenantId);
    job = await prisma.jobOpening.update({ where: { id }, data: jobData });
  } else {
    assertPermission(role, PERMISSIONS.CAREER_CREATE, permissionOverrides);
    job = await prisma.jobOpening.create({ data: { ...jobData, tenantId } });
  }

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return job;
}

export async function deleteJob(id: string) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.CAREER_DELETE, permissionOverrides);
  const { count } = await prisma.jobOpening.deleteMany({ where: { id, tenantId } });
  if (count === 0) throw new TenantAccessError("Job opening not found");
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
  const job = await prisma.jobOpening.findUnique({ where: { id: data.jobId }, select: { tenantId: true } });
  if (!job) throw new TenantAccessError("Job opening not found");
  return prisma.jobApplication.create({ data: { ...data, tenantId: job.tenantId } });
}

export async function getJobApplications(jobId?: string) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.CAREER_VIEW, permissionOverrides);
  return prisma.jobApplication.findMany({
    where: { tenantId, ...(jobId ? { jobId } : {}) },
    include: {
      job: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateApplicationStatus(id: string, status: string) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.CAREER_UPDATE, permissionOverrides);
  const { count } = await prisma.jobApplication.updateMany({ where: { id, tenantId }, data: { status } });
  if (count === 0) throw new TenantAccessError("Application not found");
  revalidatePath("/admin/careers/applications");
}

export async function deleteJobApplication(id: string) {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.CAREER_DELETE, permissionOverrides);

  const application = await prisma.jobApplication.findFirst({ where: { id, tenantId } });
  if (!application) throw new TenantAccessError("Application not found");

  if (application.cvUrl) {
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

  await prisma.jobApplication.deleteMany({ where: { id, tenantId } });

  revalidatePath("/admin/careers/applications");
}

// ─── Database Seeding & Recovery Actions ─────────────────────────────────────

export async function seedDatabase(type: "sections" | "all") {
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.SETTINGS_UPDATE, permissionOverrides);

  // 1. Create or upsert "/" page
  const homePage = await prisma.page.upsert({
    where: { tenantId_slug: { tenantId, slug: "/" } },
    update: { isPublished: true },
    create: { tenantId, slug: "/", title: "Home", isPublished: true },
  });

  // 2. Define homepage sections content
  const sections = [
    {
      id: `section-hero-home-${tenantId}`,
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
      id: `section-partners-home-${tenantId}`,
      type: "partners",
      order: 1,
      content: {}
    },
    {
      id: `section-services-home-${tenantId}`,
      type: "services",
      order: 2,
      content: {
        tagline: "Our Expertise",
        heading: "Comprehensive Solutions for Your Business",
        description: "We offer a wide range of services designed to help you stay ahead in the rapidly evolving digital landscape."
      }
    },
    {
      id: `section-techstack-home-${tenantId}`,
      type: "techstack",
      order: 3,
      content: {}
    },
    {
      id: `section-projects-home-${tenantId}`,
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
      id: `section-feedback-home-${tenantId}`,
      type: "feedback",
      order: 5,
      content: {}
    },
    {
      id: `section-team-home-${tenantId}`,
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
      id: `section-faq-home-${tenantId}`,
      type: "faq",
      order: 7,
      content: {
        tagline: "FAQ",
        heading: "Common Questions"
      }
    },
    {
      id: `section-contact-home-${tenantId}`,
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
    where: { tenantId_key: { tenantId, key: "globalTheme" } },
    update: {},
    create: {
      tenantId,
      key: "globalTheme",
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
        where: { tenantId_slug: { tenantId, slug: project.slug } },
        update: {},
        create: {
          tenantId,
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
        where: { tenantId_slug: { tenantId, slug: post.slug } },
        update: {},
        create: {
          tenantId,
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
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
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
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800",
        type: "case-study",
        published: true,
        content: "Comprehensive overview of how we engineered a custom WebRTC platform for Nova Health featuring client-side TensorFlow models that securely triage health alerts before routing to matching practitioners.",
      },
    ];

    for (const cs of caseStudies) {
      await prisma.post.upsert({
        where: { tenantId_slug: { tenantId, slug: cs.slug } },
        update: {},
        create: { ...cs, tenantId },
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
        where: { tenantId_slug: { tenantId, slug: job.slug } },
        update: {},
        create: { ...job, tenantId },
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
