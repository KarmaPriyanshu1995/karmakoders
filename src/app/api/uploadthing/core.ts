import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 10 } })
    .middleware(async () => {
      const { user, tenantId, role, permissionOverrides } = await requireTenantContext();
      assertPermission(role, PERMISSIONS.MEDIA_CREATE, permissionOverrides);
      return { userId: user.id, tenantId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.media.create({
        data: {
          tenantId: metadata.tenantId,
          url: file.url,
          key: file.key,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          uploadedById: metadata.userId,
        },
      });
      return { uploadedBy: metadata.userId };
    }),

  cvUploader: f({ pdf: { maxFileSize: "4MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
