import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/product-ui";
import { generateFaqSchema } from "@/lib/seo/schemaGenerator";
import { isSignAppEnabled } from "@/platform/env/flags";
import { EARLY_ACCESS_ANCHOR, getSignPrimaryCta } from "@/modules/sign/launch";
import { BLOCKED_DOCUMENT_TYPES, SIGN_TEMPLATES } from "@/modules/sign/templates";
import {
  FEATURES,
  FINAL_CTA,
  HOW_IT_WORKS,
  LANDING_FAQ,
  LANDING_HERO,
  SECURITY_POINTS,
} from "@/modules/sign/content/landing";
import { JsonLd, signPageMetadata, softwareApplicationJsonLd } from "@/modules/sign/seo";
import { EarlyAccessForm, FaqList, LegalDisclaimer, SignCtaButton, TemplateCard } from "@/modules/sign/ui";

export const metadata = signPageMetadata({
  title: "KarmaKoders Sign — e-sign NDAs, NOCs and contracts in under 60 seconds",
  description:
    "Create and e-sign NDAs, NOCs, contractor agreements and offer letters. Signers need no account. Flat pricing, no per-seat fees.",
  path: "/tools/sign",
});

function SeePricing() {
  return (
    <Button variant="outline" size="lg" asChild>
      <Link href="/tools/sign/pricing">See pricing</Link>
    </Button>
  );
}

export default function SignLandingPage() {
  const appEnabled = isSignAppEnabled();
  const cta = getSignPrimaryCta(appEnabled);

  return (
    <div className="space-y-24">
      <JsonLd data={[softwareApplicationJsonLd(), generateFaqSchema({ questions: [...LANDING_FAQ] })]} />

      <section aria-labelledby="hero-heading" className="space-y-8">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">KarmaKoders Sign</p>
        <h1 id="hero-heading" className="text-4xl font-black tracking-tight text-white md:text-5xl">
          {LANDING_HERO.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#A39F97]">{LANDING_HERO.subtitle}</p>
        <div className="flex flex-wrap gap-3">
          <SignCtaButton cta={cta} />
          <SeePricing />
        </div>
      </section>

      <section aria-labelledby="how-heading" className="space-y-8">
        <h2 id="how-heading" className="text-2xl font-bold text-white md:text-3xl">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-[#FFC300] font-bold text-[#1C1B1A]"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A39F97]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="templates-heading" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="templates-heading" className="text-2xl font-bold text-white md:text-3xl">
            Templates
          </h2>
          <Link
            href="/tools/sign/templates"
            className="rounded text-sm font-semibold text-[#FFC300] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]"
          >
            All templates
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SIGN_TEMPLATES.map((template) => (
            <li key={template.slug}>
              <TemplateCard template={template} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="features-heading" className="space-y-8">
        <h2 id="features-heading" className="text-2xl font-bold text-white md:text-3xl">
          Features
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A39F97]">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="security-heading" className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 id="security-heading" className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
            <ShieldCheck aria-hidden className="size-7 text-[#FFC300]" />
            Security and legal
          </h2>
          <ul className="space-y-3">
            {SECURITY_POINTS.map((point) => (
              <li key={point} className="flex gap-2 text-[#A39F97]">
                <Lock aria-hidden className="mt-1 size-4 shrink-0 text-[#FFC300]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h3 className="font-semibold text-amber-100">Not for these documents</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#A39F97]">
            {BLOCKED_DOCUMENT_TYPES.map((type) => (
              <li key={type}>{type}</li>
            ))}
          </ul>
        </div>
        <LegalDisclaimer className="md:col-span-2" />
      </section>

      <section aria-labelledby="faq-heading" className="space-y-6">
        <h2 id="faq-heading" className="text-2xl font-bold text-white md:text-3xl">
          Frequently asked questions
        </h2>
        <FaqList items={LANDING_FAQ} idPrefix="landing-faq" />
      </section>

      <section
        aria-labelledby="final-cta-heading"
        className="space-y-6 rounded-3xl border border-[#FFC300]/30 bg-[#1C1B1A] p-8 text-center md:p-12"
      >
        <h2 id="final-cta-heading" className="text-2xl font-bold text-white md:text-3xl">
          {FINAL_CTA.title}
        </h2>
        <p className="mx-auto max-w-xl text-[#A39F97]">{FINAL_CTA.body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <SignCtaButton cta={cta} />
          <SeePricing />
        </div>
      </section>

      {appEnabled ? null : (
        <section id={EARLY_ACCESS_ANCHOR} aria-labelledby="early-access-heading" className="scroll-mt-32 space-y-4">
          <h2 id="early-access-heading" className="text-2xl font-bold text-white">
            Get early access
          </h2>
          <p className="max-w-xl text-[#A39F97]">
            KarmaKoders Sign is opening soon. Join the list and we&apos;ll email you when you can send your first
            document.
          </p>
          <EarlyAccessForm source="landing" />
        </section>
      )}
    </div>
  );
}
