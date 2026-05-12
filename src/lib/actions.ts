"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Page Actions ─────────────────────────────────────────────────────────────

export async function getPages() {
  return prisma.page.findMany({
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { title: "asc" },
  });
}

export async function getPageBySlug(slug: string) {
  return prisma.page.findUnique({
    where: { slug },
    include: { sections: { orderBy: { order: "asc" } } },
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
