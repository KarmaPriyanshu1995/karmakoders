export interface NavChild {
  name: string;
  href: string;
  description?: string;
}

export interface NavItem {
  name: string;
  href: string;
  children?: NavChild[];
}

export const PRIMARY_NAV: NavItem[] = [
  {
    name: "Services",
    href: "/services",
    children: [
      { name: "Custom Software", href: "/services#custom-software-development", description: "Product systems built around your workflow" },
      { name: "Mobile Apps", href: "/services#mobile-app-development", description: "iOS, Android, and cross-platform apps" },
      { name: "AI Integrations", href: "/services#ai-solutions-integrations", description: "Agents, RAG, and model orchestration" },
      { name: "SaaS", href: "/services#saas-development", description: "Multi-tenant products ready to scale" },
      { name: "Web Engineering", href: "/services#website-development", description: "High-performance Next.js platforms" },
      { name: "DevOps", href: "/services#cloud-engineering-devops", description: "Cloud, CI, and production hardening" },
    ],
  },
  {
    name: "Work",
    href: "/work",
    children: [
      { name: "Portfolio", href: "/portfolio", description: "Live web and mobile deployments" },
      { name: "Case Studies", href: "/case-studies", description: "Deep architectural teardowns" },
      { name: "Success Stories", href: "/success-stories", description: "Client ROI, metrics, and proof" },
    ],
  },
  {
    name: "Insights",
    href: "/insights",
    children: [
      { name: "Tech Blog", href: "/blog", description: "Framework and architecture evaluations" },
      { name: "Startup Ideas", href: "/startup-ideas", description: "4-week ready-to-build MVP blueprints" },
      { name: "Free Prompts", href: "/prompts", description: "Cursor, Claude, and video prompts" },
      { name: "Free Tools", href: "/free-tools", description: "Domain compare, compressor, MVP calculator" },
    ],
  },
  { name: "Pricing", href: "/pricing" },
  {
    name: "About",
    href: "/about",
    children: [
      { name: "Company Story", href: "/about", description: "US Delaware entity and timezone overlap" },
      { name: "Careers", href: "/careers", description: "Join the engineering team" },
    ],
  },
];

export const START_PROJECT_HREF = "/contact";

export function navItemIsActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return Boolean(item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)));
}
