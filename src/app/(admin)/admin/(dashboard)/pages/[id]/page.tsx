import { prisma } from "@/lib/prisma";
import { EditorClient } from "@/components/admin/EditorClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id: id },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (!page) {
    notFound();
  }

  const initialSections = page.sections.map((s) => ({
    id: s.id,
    type: s.type,
    content: JSON.parse(s.content),
    order: s.order,
  }));

  return (
    <EditorClient
      pageId={page.id}
      pageSlug={page.slug}
      pageTitle={page.title}
      initialSections={initialSections}
    />
  );
}
