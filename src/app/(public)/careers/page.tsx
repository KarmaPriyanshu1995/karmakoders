import { CmsPageView, generateCmsMetadata } from "@/components/CmsPageView";
import { CareersJobList } from "@/components/careers/CareersJobList";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateCmsMetadata("careers");
}

export default async function CareersPage() {
  const jobs = await prisma.jobOpening.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CmsPageView
      slug="careers"
      appendContent={<CareersJobList jobs={jobs} />}
    />
  );
}
