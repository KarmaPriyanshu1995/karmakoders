import { prisma } from "@/lib/prisma";
import { EditorClient } from "@/components/admin/EditorClient";
import { notFound } from "next/navigation";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId, role } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.PAGE_VIEW);
  const page = await prisma.page.findFirst({
    where: { id, tenantId },
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
