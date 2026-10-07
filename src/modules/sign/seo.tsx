import "server-only";

import type { Metadata } from "next";
import { PLANS, PRICING_PLAN_IDS } from "@/platform/billing/plans";

export const SITE_ORIGIN = "https://www.karmakoders.com";
const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "KarmaKoders Sign" };

/** Unique title/description + canonical, Open Graph and Twitter tags for a public page. */
export function signPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const url = `${SITE_ORIGIN}${input.path}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "KarmaKoders",
      title: input.title,
      description: input.description,
      url,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [OG_IMAGE.url],
    },
    ...(input.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Price in major units with 2 decimals, from integer cents (schema.org expects a string). */
function priceFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** SoftwareApplication with one Offer per pricing plan (plans.ts is the only price source). */
export function softwareApplicationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KarmaKoders Sign",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_ORIGIN}/tools/sign`,
    description:
      "Create and e-sign NDAs, NOCs and contracts in under 60 seconds. Signers need no account; flat pricing with no per-seat fees.",
    publisher: { "@type": "Organization", name: "KarmaKoders", url: SITE_ORIGIN },
    offers: PRICING_PLAN_IDS.map((id) => {
      const plan = PLANS[id];
      return {
        "@type": "Offer",
        name: plan.displayName,
        description: plan.description,
        price: priceFromCents(plan.amountCents),
        priceCurrency: "USD",
        url: `${SITE_ORIGIN}/tools/sign/pricing`,
        ...(plan.interval === "month" || plan.interval === "year"
          ? {
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: priceFromCents(plan.amountCents),
                priceCurrency: "USD",
                billingDuration: plan.interval === "month" ? "P1M" : "P1Y",
              },
            }
          : {}),
      };
    }),
  };
}

/** Renders one or more JSON-LD objects. Content is built server-side from static data. */
export function JsonLd({ data }: { data: object | object[] }) {
  // Escape "<" so no string in the data can close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
