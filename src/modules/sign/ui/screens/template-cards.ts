import { SIGN_TEMPLATES, TEMPLATE_CATEGORY_LABELS, type TemplateCategory } from "@/modules/sign/templates/catalog";
import type { BuilderTemplateVM, TemplatePickerVM, TemplateCardVM } from "../view-models";

/** Template cards from the canonical catalog (real data, not a fixture). */
export function templateCards(): TemplateCardVM[] {
  return SIGN_TEMPLATES.map((t) => ({
    slug: t.slug,
    name: t.name,
    shortDescription: t.shortDescription,
    category: t.category,
    categoryLabel: TEMPLATE_CATEGORY_LABELS[t.category],
  }));
}

export function templatePickerVM(): TemplatePickerVM {
  const used = new Set(SIGN_TEMPLATES.map((t) => t.category));
  const categories = (Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[])
    .filter((id) => used.has(id))
    .map((id) => ({ id, label: TEMPLATE_CATEGORY_LABELS[id] }));
  return { templates: templateCards(), categories };
}

export function builderTemplateVM(slug: string): BuilderTemplateVM | null {
  const t = SIGN_TEMPLATES.find((item) => item.slug === slug);
  return t ? { slug: t.slug, name: t.name, fields: t.fields, signerRoles: t.signerRoles } : null;
}

/** Quick-start cards on the dashboard: the most common templates first. */
export function quickStartCards(max = 4): TemplateCardVM[] {
  const preferred = ["mutual-nda", "freelance-service-agreement", "offer-letter", "independent-contractor-agreement"];
  const cards = templateCards();
  return preferred.map((slug) => cards.find((c) => c.slug === slug)).filter((c): c is TemplateCardVM => !!c).slice(0, max);
}
