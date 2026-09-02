import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { PostEditorForm } from "@/components/admin/PostEditorForm";
import { requireTenantContext } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tenantId, role, permissionOverrides } = await requireTenantContext();
  assertPermission(role, PERMISSIONS.BLOG_VIEW, permissionOverrides);
  const isNew = id === "new";

  const post = isNew
    ? { title: "", slug: "", content: "", excerpt: "", image: "", category: "", author: "", type: "blog", published: false }
    : await prisma.post.findFirst({ where: { id, tenantId } });

  if (!post && !isNew) {
    redirect("/admin/blog");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isNew ? "Create New Post" : "Edit Post"}
            </h2>
          </div>
        </div>
      </div>

      <PostEditorForm post={post} isNew={isNew} id={id} />
    </div>
  );
}
