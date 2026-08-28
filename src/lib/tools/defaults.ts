import { prisma } from "@/lib/prisma";
import { DEFAULT_FREE_TOOLS_SETTINGS, FREE_TOOLS_SETTINGS_KEY } from "@/lib/tools/settings";
import { HOSTINGER_DOMAIN_AFFILIATE_URL } from "@/lib/tools/hostinger-affiliate";
import { DOMAIN_COMPARE_CONTENT, HOSTINGER_VS_NAMECHEAP_CONTENT } from "@/lib/tools/domain-compare-content";

export async function ensureDomainProviders(tenantId: string): Promise<void> {
  const providers = [
    {
      name: "GoDaddy",
      slug: "godaddy",
      adapterKey: "godaddy",
      websiteUrl: "https://www.godaddy.com/domainsearch/find?checkAvail=1",
      priority: 10,
      logoUrl: null as string | null,
      apiEnabled: true,
      affiliateEnabled: false,
      status: "active" as const,
    },
    {
      name: "Hostinger",
      slug: "hostinger",
      adapterKey: "hostinger",
      websiteUrl: "https://www.hostinger.com/in",
      priority: 15,
      logoUrl: null,
      apiEnabled: true,
      affiliateEnabled: true,
      status: "active" as const,
    },
    {
      name: "Namecheap",
      slug: "namecheap",
      adapterKey: "namecheap",
      websiteUrl: "https://www.namecheap.com",
      priority: 20,
      logoUrl: null,
      apiEnabled: false,
      affiliateEnabled: false,
      status: "disabled" as const,
    },
    {
      name: "Porkbun",
      slug: "porkbun",
      adapterKey: "porkbun",
      websiteUrl: "https://porkbun.com",
      priority: 30,
      logoUrl: null,
      apiEnabled: false,
      affiliateEnabled: false,
      status: "disabled" as const,
    },
  ];

  for (const provider of providers) {
    const { apiEnabled, affiliateEnabled, status, ...rest } = provider;
    await prisma.domainProvider.upsert({
      where: { tenantId_slug: { tenantId, slug: provider.slug } },
      update: {
        name: rest.name,
        adapterKey: rest.adapterKey,
        websiteUrl: rest.websiteUrl,
        priority: rest.priority,
        apiEnabled,
        affiliateEnabled,
        status,
      },
      create: {
        tenantId,
        ...rest,
        apiEnabled,
        affiliateEnabled,
        status,
      },
    });
  }

  await ensureHostingerAffiliate(tenantId);
  await disableLegacyAffiliatePrograms(tenantId);
}

async function disableLegacyAffiliatePrograms(tenantId: string): Promise<void> {
  const legacySlugs = ["namecheap", "porkbun", "godaddy"];
  for (const slug of legacySlugs) {
    const provider = await prisma.domainProvider.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
    if (!provider) continue;
    await prisma.affiliateProgram.updateMany({
      where: { tenantId, providerId: provider.id },
      data: { status: "disabled" },
    });
  }
}

export async function ensureDomainCompareContent(tenantId: string): Promise<void> {
  await prisma.freeTool.updateMany({
    where: { tenantId, slug: "domain-compare" },
    data: {
      contentJson: JSON.stringify(DOMAIN_COMPARE_CONTENT),
      longDescription:
        "Check whether a domain is available and compare registration, renewal, and transfer prices from GoDaddy and Hostinger — with founder-focused guidance on total cost of ownership.",
      seoDescription:
        "Compare domain availability, first-year price, renewal, and 3-year cost across registrars. Built for founders choosing a startup domain name.",
      seoKeywords:
        "domain compare, domain prices, cheapest domain, domain registrar, startup domain, hostinger domain, namecheap domain",
    },
  });
}

export async function ensureHostingerAffiliate(tenantId: string): Promise<void> {
  const hostinger = await prisma.domainProvider.findUnique({
    where: { tenantId_slug: { tenantId, slug: "hostinger" } },
  });
  if (!hostinger) return;

  await prisma.domainProvider.update({
    where: { id: hostinger.id },
    data: {
      affiliateEnabled: true,
      websiteUrl: "https://www.hostinger.com/in",
    },
  });

  const existing = await prisma.affiliateProgram.findFirst({
    where: { tenantId, providerId: hostinger.id, programName: "Hostinger Domains" },
  });

  const payload = {
    programName: "Hostinger Domains",
    affiliateNetwork: "Hostinger",
    trackingUrl: HOSTINGER_DOMAIN_AFFILIATE_URL,
    status: "active",
    commissionType: "percent",
    commissionValue: 40,
    cookieDuration: 30,
    notes: "Referral code WBAKARMAKE6E. Domain commission on special affiliate offers only.",
  };

  if (existing) {
    await prisma.affiliateProgram.update({ where: { id: existing.id }, data: payload });
    return;
  }

  await prisma.affiliateProgram.create({
    data: {
      ...payload,
      tenantId,
      providerId: hostinger.id,
    },
  });
}

export async function ensureRegistrarComparisons(tenantId: string): Promise<void> {
  const hostinger = await prisma.domainProvider.findUnique({ where: { tenantId_slug: { tenantId, slug: "hostinger" } } });
  const namecheap = await prisma.domainProvider.findUnique({ where: { tenantId_slug: { tenantId, slug: "namecheap" } } });

  if (hostinger && namecheap) {
    await prisma.registrarComparison.upsert({
      where: { tenantId_slug: { tenantId, slug: HOSTINGER_VS_NAMECHEAP_CONTENT.slug } },
      update: {
        title: HOSTINGER_VS_NAMECHEAP_CONTENT.title,
        seoTitle: HOSTINGER_VS_NAMECHEAP_CONTENT.seoTitle,
        seoDescription: HOSTINGER_VS_NAMECHEAP_CONTENT.seoDescription,
        content: HOSTINGER_VS_NAMECHEAP_CONTENT.content,
        status: "published",
      },
      create: {
        tenantId,
        providerAId: hostinger.id,
        providerBId: namecheap.id,
        slug: HOSTINGER_VS_NAMECHEAP_CONTENT.slug,
        title: HOSTINGER_VS_NAMECHEAP_CONTENT.title,
        seoTitle: HOSTINGER_VS_NAMECHEAP_CONTENT.seoTitle,
        seoDescription: HOSTINGER_VS_NAMECHEAP_CONTENT.seoDescription,
        content: HOSTINGER_VS_NAMECHEAP_CONTENT.content,
        status: "published",
      },
    });
  }
}

export async function ensureFreeToolsDefaults(tenantId: string): Promise<void> {
  await ensureDomainProviders(tenantId);
  await ensureDomainCompareContent(tenantId);
  await ensureRegistrarComparisons(tenantId);

  const already = await prisma.freeTool.findFirst({
    where: { tenantId, slug: "domain-compare" },
    select: { id: true },
  });
  if (already) return;

  await prisma.siteConfig.upsert({
    where: { tenantId_key: { tenantId, key: FREE_TOOLS_SETTINGS_KEY } },
    update: {},
    create: { tenantId, key: FREE_TOOLS_SETTINGS_KEY, value: JSON.stringify(DEFAULT_FREE_TOOLS_SETTINGS) },
  });

  const categories = [
    { name: "Domains", slug: "domains", sortOrder: 10 },
    { name: "SEO", slug: "seo", sortOrder: 20 },
    { name: "Marketing", slug: "marketing", sortOrder: 30 },
    { name: "Development", slug: "development", sortOrder: 40 },
    { name: "Business", slug: "business", sortOrder: 50 },
    { name: "Productivity", slug: "productivity", sortOrder: 60 },
    { name: "Finance", slug: "finance", sortOrder: 70 },
  ];

  for (const category of categories) {
    await prisma.toolCategory.upsert({
      where: { tenantId_slug: { tenantId, slug: category.slug } },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: { tenantId, ...category },
    });
  }

  const domainsCategory = await prisma.toolCategory.findUnique({
    where: { tenantId_slug: { tenantId, slug: "domains" } },
  });

  await prisma.freeTool.upsert({
    where: { tenantId_slug: { tenantId, slug: "domain-compare" } },
    update: {},
    create: {
      tenantId,
      name: "Domain Compare",
      slug: "domain-compare",
      shortDescription: "Compare domain prices and availability across multiple registrars.",
      longDescription: "Check whether a domain is available and compare registration, renewal, and transfer prices from GoDaddy, Hostinger, Namecheap, Porkbun, and other connected registrars.",
      icon: "Globe",
      categoryId: domainsCategory?.id,
      status: "published",
      isFeatured: true,
      isPublic: true,
      sortOrder: 10,
      toolUrl: "/free-tools/domain-compare",
      seoTitle: "Compare Domain Prices Across Registrars",
      seoDescription: "Check domain availability and compare registration and renewal prices across multiple registrars.",
      seoKeywords: "domain compare, domain prices, cheapest domain, domain registrar",
      canonicalUrl: "https://www.karmakoders.com/free-tools/domain-compare",
      ogTitle: "Compare Domain Prices",
      ogDescription: "Check domain availability and compare registration and renewal prices across multiple registrars.",
      robots: "index,follow",
      contentJson: JSON.stringify(DOMAIN_COMPARE_CONTENT),
    },
  });

  const tlds = [
    {
      tld: "com",
      name: ".com domains",
      description: "The most widely recognized generic top-level domain for businesses and products.",
      seoTitle: ".com Domain Prices and Availability",
      seoDescription: "Research .com domain availability and compare registrar pricing before you buy.",
      content:
        "<h2>About .com</h2><p>.com remains the default choice for global brands. Availability is tighter than newer extensions, so it is worth comparing registrars before you register.</p><p><a href=\"/free-tools/domain-compare\">Compare .com domain prices</a> with Domain Compare.</p>",
    },
    {
      tld: "net",
      name: ".net domains",
      description: "A long-standing alternative to .com, often used by networks, infrastructure, and tech products.",
      seoTitle: ".net Domain Prices and Availability",
      seoDescription: "Check .net domain availability and compare registration and renewal prices.",
      content:
        "<h2>About .net</h2><p>.net is a credible alternative when the matching .com is taken. Compare first-year and renewal pricing before you commit.</p><p><a href=\"/free-tools/domain-compare\">Domain Compare →</a></p>",
    },
    {
      tld: "org",
      name: ".org domains",
      description: "The established extension for organizations, communities, and non-profits.",
      seoTitle: ".org Domain Prices and Availability",
      seoDescription: "Compare .org domain registration and renewal prices across registrars.",
      content:
        "<h2>About .org</h2><p>.org signals an organization or community. Pricing is usually close to .com, but promotions differ by registrar.</p><p><a href=\"/free-tools/domain-compare\">Compare domain prices</a></p>",
    },
    {
      tld: "io",
      name: ".io domains",
      description: "A popular choice for startups and developer tools.",
      seoTitle: ".io Domain Prices and Availability",
      seoDescription: "Compare .io domain prices and availability across registrars.",
      content:
        "<h2>About .io</h2><p>.io is widely used by software startups. Renewal prices are often higher than .com, so look at multi-year cost.</p><p><a href=\"/free-tools/domain-compare\">Check your domain →</a></p>",
    },
    {
      tld: "ai",
      name: ".ai domains",
      description: "A strong fit for AI products and research brands.",
      seoTitle: ".ai Domain Prices and Availability",
      seoDescription: "Research .ai domain availability and compare registrar pricing.",
      content:
        "<h2>About .ai</h2><p>.ai names are in demand for AI companies. Prices and premium status vary — confirm availability before you announce a brand.</p><p><a href=\"/free-tools/domain-compare\">Compare .ai domain prices</a></p>",
    },
    {
      tld: "co",
      name: ".co domains",
      description: "A short commercial alternative when .com is unavailable.",
      seoTitle: ".co Domain Prices and Availability",
      seoDescription: "Compare .co domain registration and renewal prices.",
      content:
        "<h2>About .co</h2><p>.co is a compact alternative to .com. Check both first-year promotions and renewal cost.</p><p><a href=\"/free-tools/domain-compare\">Domain Compare →</a></p>",
    },
  ];

  for (const tld of tlds) {
    await prisma.domainExtension.upsert({
      where: { tenantId_tld: { tenantId, tld: tld.tld } },
      update: {},
      create: { tenantId, ...tld, status: "published" },
    });
  }

  const godaddy = await prisma.domainProvider.findUnique({ where: { tenantId_slug: { tenantId, slug: "godaddy" } } });
  const namecheap = await prisma.domainProvider.findUnique({ where: { tenantId_slug: { tenantId, slug: "namecheap" } } });
  const porkbun = await prisma.domainProvider.findUnique({ where: { tenantId_slug: { tenantId, slug: "porkbun" } } });

  if (godaddy && namecheap) {
    await prisma.registrarComparison.upsert({
      where: { tenantId_slug: { tenantId, slug: "godaddy-vs-namecheap" } },
      update: {},
      create: {
        tenantId,
        providerAId: godaddy.id,
        providerBId: namecheap.id,
        slug: "godaddy-vs-namecheap",
        title: "GoDaddy vs Namecheap",
        seoTitle: "GoDaddy vs Namecheap: Domain Pricing Compared",
        seoDescription: "Compare GoDaddy and Namecheap domain registration, renewal, and privacy — then check a specific name.",
        status: "published",
        content:
          "<p>GoDaddy and Namecheap are two of the most widely used registrars. GoDaddy typically offers a huge TLD catalog and frequent first-year promotions. Namecheap is often chosen for included WHOIS privacy and straightforward pricing.</p><p>Neither is universally cheaper. Use live prices for the exact name you want.</p><p><a href=\"/free-tools/domain-compare\">Check your domain →</a></p>",
      },
    });
  }

  if (namecheap && porkbun) {
    await prisma.registrarComparison.upsert({
      where: { tenantId_slug: { tenantId, slug: "namecheap-vs-porkbun" } },
      update: {},
      create: {
        tenantId,
        providerAId: namecheap.id,
        providerBId: porkbun.id,
        slug: "namecheap-vs-porkbun",
        title: "Namecheap vs Porkbun",
        seoTitle: "Namecheap vs Porkbun: Which Registrar Fits You?",
        seoDescription: "Compare Namecheap and Porkbun on domain pricing, privacy, and renewals.",
        status: "published",
        content:
          "<p>Namecheap and Porkbun both emphasize privacy and competitive catalog pricing. Porkbun often includes WHOIS privacy and DNS at no extra cost. Namecheap has a larger retail footprint and a long-running marketplace.</p><p>Compare the specific TLD you need rather than assuming one winner.</p><p><a href=\"/free-tools/domain-compare\">Check your domain →</a></p>",
      },
    });
  }

  const landingPages = [
    {
      slug: "cheapest-domain-registrar",
      pageType: "cheapest-registrar",
      title: "Cheapest Domain Registrar",
      seoTitle: "Cheapest Domain Registrar — Compare Real Prices",
      seoDescription: "Find a low-cost domain registrar by comparing first-year and renewal prices, not just advertised deals.",
      content:
        "<p>The cheapest domain registrar depends on the extension and whether you care about year one or the next five years. Promotional first-year pricing can hide higher renewals.</p><p>Use <a href=\"/free-tools/domain-compare\">Domain Compare</a> to check a specific name. We do not claim a guaranteed cheapest registrar — prices change and not every provider is always reachable.</p>",
    },
    {
      slug: "cheapest-domain-renewal",
      pageType: "cheapest-renewal",
      title: "Cheapest Domain Renewal",
      seoTitle: "Cheapest Domain Renewal Prices Compared",
      seoDescription: "Compare domain renewal prices so you are not surprised after a cheap first year.",
      content:
        "<p>Renewal price is what you pay to keep a name. If you plan to hold a domain for several years, ranking by renewal or three-year cost is more useful than first-year ads.</p><p><a href=\"/free-tools/domain-compare\">Compare renewal prices →</a></p>",
    },
    {
      slug: "cheap-com-domains",
      pageType: "tld-deal",
      title: "Cheap .com Domains",
      seoTitle: "Cheap .com Domains — Compare Registrar Prices",
      seoDescription: "Look up .com availability and compare registration and renewal prices across registrars.",
      content:
        "<p>.com names are still the default for most businesses. “Cheap” usually means a promotional first year, not a permanently low renewal.</p><p>Start with <a href=\"/domains/com\">.com domain research</a> or jump to <a href=\"/free-tools/domain-compare\">Domain Compare</a>.</p>",
    },
    {
      slug: "best-domain-registrar",
      pageType: "best-registrar",
      title: "Best Domain Registrar",
      seoTitle: "Best Domain Registrar — How to Choose",
      seoDescription: "What to look for in a domain registrar besides the first-year price.",
      content:
        "<p>The best registrar for you depends on renewal cost, privacy, DNS, support, and whether you need a huge TLD list. There is no single best registrar for every name.</p><p>Compare live quotes in <a href=\"/free-tools/domain-compare\">Domain Compare</a>, or read <a href=\"/compare/godaddy-vs-namecheap\">GoDaddy vs Namecheap</a>.</p>",
    },
    {
      slug: "best-domain-registrar-for-startups",
      pageType: "best-for",
      title: "Best Domain Registrar for Startups",
      seoTitle: "Best Domain Registrar for Startups",
      seoDescription: "How early-stage teams should pick a registrar: renewals, privacy, and names that can transfer later.",
      content:
        "<p>Startups should optimize for a clean brand name, included privacy, and an easy transfer path if they later consolidate domains. First-year coupons matter less than a five-year hold.</p><p><a href=\"/free-tools/domain-compare\">Check your domain →</a></p>",
    },
  ];

  for (const page of landingPages) {
    await prisma.seoLandingPage.upsert({
      where: { tenantId_slug: { tenantId, slug: page.slug } },
      update: {},
      create: { tenantId, ...page, status: "published" },
    });
  }
}
