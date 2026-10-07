import Link from "next/link";
import { FileUp } from "lucide-react";
import { Badge, Card, CardContent, CardDescription, CardHeader } from "@/components/product-ui";
import { generateBreadcrumbSchema } from "@/lib/seo/schemaGenerator";
import { isSignAppEnabled } from "@/platform/env/flags";
import { getSignPrimaryCta } from "@/modules/sign/launch";
import { SIGN_TEMPLATES } from "@/modules/sign/templates";
import { JsonLd, SITE_ORIGIN, signPageMetadata } from "@/modules/sign/seo";
import { BlockedTypesNotice, LegalDisclaimer, SignCtaButton, TemplateCard } from "@/modules/sign/ui";

export const metadata = signPageMetadata({
  title: "Free e-signature templates — NDAs, contractor agreements & more | KarmaKoders Sign",
  description:
    "Free e-signature templates: mutual and one-way NDAs, contractor and freelance agreements, offer letters, NOCs, consent forms and receipts. Preview free, pay only when you send.",
  path: "/tools/sign/templates",
});

export default function SignTemplatesPage() {
  const cta = getSignPrimaryCta(isSignAppEnabled());

  return (
    <div className="space-y-10">
      <JsonLd
        data={generateBreadcrumbSchema({
          items: [
            { name: "KarmaKoders Sign", url: `${SITE_ORIGIN}/tools/sign` },
            { name: "Templates", url: `${SITE_ORIGIN}/tools/sign/templates` },
          ],
        })}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-[#A39F97]">
        <Link href="/tools/sign" className="rounded hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]">
          Sign
        </Link>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-white">Templates</span>
      </nav>

      <header className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Free e-signature templates</h1>
        <p className="max-w-2xl leading-relaxed text-[#A39F97]">
          Ready-to-send NDAs, contractor agreements, offer letters and more. Add your logo and parties, invite
          signers, and send. Signers never need an account.
        </p>
        <SignCtaButton cta={cta} />
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {SIGN_TEMPLATES.map((template) => (
          <li key={template.slug}>
            <TemplateCard template={template} headingLevel="h2" />
          </li>
        ))}
        <li>
          <Card className="h-full border-dashed">
            <CardHeader>
              <Badge variant="outline" className="w-fit">
                Your file
              </Badge>
              <h2 className="flex items-center gap-2 pt-2 text-lg font-semibold text-white">
                <FileUp aria-hidden className="size-5 text-[#FFC300]" />
                Upload your own PDF
              </h2>
              <CardDescription className="text-[#A39F97]">
                Already have the document? Upload a PDF and place signature fields on it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignCtaButton cta={cta} size="default" variant="outline" />
            </CardContent>
          </Card>
        </li>
      </ul>

      <BlockedTypesNotice />
      <LegalDisclaimer />
    </div>
  );
}
