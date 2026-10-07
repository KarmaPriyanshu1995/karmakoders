import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/product-ui";
import { generateBreadcrumbSchema, generateFaqSchema } from "@/lib/seo/schemaGenerator";
import { isSignAppEnabled } from "@/platform/env/flags";
import { getSignPrimaryCta } from "@/modules/sign/launch";
import {
  TEMPLATE_CATEGORY_LABELS,
  getRelatedTemplates,
  getTemplateBySlug,
  listTemplateSlugs,
} from "@/modules/sign/templates";
import { JsonLd, SITE_ORIGIN, signPageMetadata } from "@/modules/sign/seo";
import { TEMPLATE_DISCLAIMER } from "@/modules/sign/content/templates";
import {
  BlockedTypesNotice,
  FaqList,
  LegalDisclaimer,
  SignCtaButton,
  TemplateCard,
  TemplatePreview,
} from "@/modules/sign/ui";

type PageProps = { params: Promise<{ slug: string }> };

/** Pre-render every catalog slug. Unknown slugs 404 via notFound() in the page. */
export function generateStaticParams() {
  return listTemplateSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) return {};
  return signPageMetadata({
    title: `${template.name} template - free e-signature | KarmaKoders Sign`,
    description: template.shortDescription,
    path: `/tools/sign/templates/${template.slug}`,
  });
}

export default async function SignTemplateDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const cta = getSignPrimaryCta(isSignAppEnabled());
  const related = getRelatedTemplates(template.slug, 3);
  const url = `${SITE_ORIGIN}/tools/sign/templates/${template.slug}`;

  return (
    <div className="space-y-12">
      <JsonLd
        data={[
          generateBreadcrumbSchema({
            items: [
              { name: "KarmaKoders Sign", url: `${SITE_ORIGIN}/tools/sign` },
              { name: "Templates", url: `${SITE_ORIGIN}/tools/sign/templates` },
              { name: template.name, url },
            ],
          }),
          generateFaqSchema({ questions: template.faq }),
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-[#A39F97]">
        <Link href="/tools/sign" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]">
          Sign
        </Link>
        <span aria-hidden className="mx-2">/</span>
        <Link
          href="/tools/sign/templates"
          className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]"
        >
          Templates
        </Link>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-white">{template.name}</span>
      </nav>

      <header className="space-y-4">
        <Badge variant="secondary">{TEMPLATE_CATEGORY_LABELS[template.category]}</Badge>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
          {template.name} template - free e-signature
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#A39F97]">{template.shortDescription}</p>
        <SignCtaButton cta={cta} />
      </header>

      <section aria-labelledby="about-heading" className="space-y-4">
        <h2 id="about-heading" className="text-xl font-bold text-white">
          About this template
        </h2>
        {template.longDescription.split("\n\n").map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="max-w-3xl leading-relaxed text-[#A39F97]">
            {paragraph}
          </p>
        ))}
      </section>

      <section aria-labelledby="preview-heading" className="space-y-4">
        <h2 id="preview-heading" className="text-xl font-bold text-white">
          Preview
        </h2>
        <TemplatePreview name={template.name} fields={template.fields} signerRoles={template.signerRoles} />
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="who-heading" className="space-y-3">
          <h2 id="who-heading" className="text-lg font-bold text-white">
            Who uses it
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-[#A39F97]">
            {template.whoUsesIt.map((who) => (
              <li key={who}>{who}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="signers-heading" className="space-y-3">
          <h2 id="signers-heading" className="text-lg font-bold text-white">
            Signer roles
          </h2>
          <ul className="space-y-2">
            {template.signerRoles.map((role) => (
              <li key={role.key} className="text-[#A39F97]">
                <span className="font-semibold text-white">{role.label}</span> — {role.description}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="fields-heading" className="space-y-3">
        <h2 id="fields-heading" className="text-lg font-bold text-white">
          Fields you&apos;ll fill in
        </h2>
        <p className="text-sm text-[#A39F97]">
          Fields marked <span aria-hidden className="text-[#FFC300]">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {template.fields.map((field) => (
            <li key={field.key} className="text-[#A39F97]" data-required={field.required || undefined}>
              {field.label}
              {field.required ? (
                <>
                  <span aria-hidden className="ml-0.5 text-[#FFC300]">
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-heading" className="space-y-3">
        <h2 id="faq-heading" className="text-xl font-bold text-white">
          Frequently asked questions
        </h2>
        <FaqList items={template.faq} idPrefix={`faq-${template.slug}`} />
      </section>

      <section aria-label="Get started" className="space-y-4">
        <BlockedTypesNotice />
        <p className="rounded-xl border border-white/10 bg-[#1C1B1A] p-4 text-sm leading-relaxed text-[#A39F97]">
          {TEMPLATE_DISCLAIMER}
        </p>
        <LegalDisclaimer />
        <div className="flex flex-wrap gap-3">
          <SignCtaButton cta={cta} />
        </div>
        <p className="text-sm text-[#A39F97]">Free to prepare. You only pay when you send.</p>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="space-y-4">
          <h2 id="related-heading" className="text-xl font-bold text-white">
            Related templates
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.slug}>
                <TemplateCard template={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
