export interface PageContext {
  path: string;
  label: string;
  hint: string;
}

const PAGE_HINTS: Array<{ match: RegExp; label: string; hint: string }> = [
  {
    match: /^\/$/,
    label: "Home",
    hint: "Visitor is on the homepage. Welcome them warmly; ask what brought them to KarmaKoders.",
  },
  {
    match: /^\/services/,
    label: "Services",
    hint: "Visitor is looking at services. Ask if they are exploring options or ready to start a specific build.",
  },
  {
    match: /^\/portfolio(\/|$)/,
    label: "Portfolio",
    hint: "Visitor is exploring the portfolio. Ask if they want inspiration or something similar.",
  },
  {
    match: /^\/case-studies/,
    label: "Case Studies",
    hint: "Visitor is reading case studies. Ask what kind of outcome they care about — do not invent results.",
  },
  {
    match: /^\/pricing/,
    label: "Pricing",
    hint: "Visitor is on pricing. Do not invent custom-project quotes. Offer scoping or a discovery call.",
  },
  {
    match: /^\/contact/,
    label: "Contact",
    hint: "Visitor is already on contact. Help them clarify what to send the team.",
  },
  {
    match: /^\/about/,
    label: "About",
    hint: "Visitor is learning about KarmaKoders. Offer a short orientation, then ask how you can help.",
  },
  {
    match: /^\/blog/,
    label: "Blog",
    hint: "Visitor is reading content. Keep light; ask if they are researching or planning a project.",
  },
  {
    match: /^\/careers/,
    label: "Careers",
    hint: "Visitor may be a job seeker. If so, point them to careers applications; if they have a project, switch to project mode.",
  },
  {
    match: /^\/projects/,
    label: "Projects",
    hint: "Visitor is browsing projects. Ask if they are exploring or planning something similar.",
  },
];

export function getPageContext(pathname: string): PageContext {
  const path = pathname || "/";
  for (const entry of PAGE_HINTS) {
    if (entry.match.test(path)) {
      return { path, label: entry.label, hint: entry.hint };
    }
  }
  return {
    path,
    label: "Site page",
    hint: "Use only the path you know. Do not pretend to know what the visitor is thinking.",
  };
}
