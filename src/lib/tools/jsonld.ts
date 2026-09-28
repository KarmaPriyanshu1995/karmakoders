const SITE_URL = "https://www.karmakoders.com";

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data);
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

export function faqJsonLd(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function webApplicationJsonLd(input: {
  name: string;
  description: string;
  url: string;
  schemaType?: string;
  image?: string;
}) {
  const type = input.schemaType === "SoftwareApplication" ? "SoftwareApplication" : "WebApplication";
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: input.name,
    description: input.description,
    url: input.url.startsWith("http") ? input.url : `${SITE_URL}${input.url}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(input.image ? { image: input.image } : {}),
  };
}

export { SITE_URL };
