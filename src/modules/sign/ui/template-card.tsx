import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader } from "@/components/product-ui";
import { TEMPLATE_CATEGORY_LABELS, type SignTemplateMeta } from "@/modules/sign/templates";

/** Catalog card used on the landing grid, the templates index and related templates. */
export function TemplateCard({
  template,
  headingLevel = "h3",
}: {
  template: Pick<SignTemplateMeta, "slug" | "name" | "shortDescription" | "category">;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <Card className="h-full">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          {TEMPLATE_CATEGORY_LABELS[template.category]}
        </Badge>
        <Heading className="pt-2 text-lg font-semibold leading-none tracking-tight text-white">{template.name}</Heading>
        <CardDescription className="text-[#A39F97]">{template.shortDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={`/tools/sign/templates/${template.slug}`}
          className="inline-flex items-center gap-1 rounded text-sm font-semibold text-[#FFC300] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]"
        >
          View {template.name} template
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
