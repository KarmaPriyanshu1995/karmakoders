import { redirect } from "next/navigation";
import { articlePath } from "@/lib/content/post-types";

export default async function InsightsSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(articlePath(slug));
}
