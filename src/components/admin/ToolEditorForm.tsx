"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { upsertTool, saveFreeToolsSettingsAdmin, type ToolInput } from "@/lib/tool-actions";
import type { FreeToolsSettings } from "@/lib/tools/settings";

type Category = { id: string; name: string };

interface ToolRecord {
  id?: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  icon: string | null;
  categoryId: string | null;
  status: string;
  isFeatured: boolean;
  isPublic: boolean;
  sortOrder: number;
  toolUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  contentJson: string | null;
}

const TABS = ["Overview", "Settings", "SEO", "Content"] as const;

function parseContent(raw: string | null) {
  try {
    return raw
      ? JSON.parse(raw)
      : { heroHeading: "", heroSubheading: "", sections: [], faq: [] };
  } catch {
    return { heroHeading: "", heroSubheading: "", sections: [], faq: [] };
  }
}

export function ToolEditorForm({
  tool,
  categories,
  isNew,
  settings,
  extraTabs,
}: {
  tool: ToolRecord;
  categories: Category[];
  isNew: boolean;
  settings?: FreeToolsSettings;
  extraTabs?: ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number] | "More">("Overview");
  const [saving, setSaving] = useState(false);
  const content = parseContent(tool.contentJson);

  const [name, setName] = useState(tool.name);
  const [slug, setSlug] = useState(tool.slug);
  const [shortDescription, setShortDescription] = useState(tool.shortDescription);
  const [longDescription, setLongDescription] = useState(tool.longDescription);
  const [icon, setIcon] = useState(tool.icon || "Globe");
  const [categoryId, setCategoryId] = useState(tool.categoryId || "");
  const [status, setStatus] = useState(tool.status || "draft");
  const [isFeatured, setIsFeatured] = useState(tool.isFeatured);
  const [isPublic, setIsPublic] = useState(tool.isPublic);
  const [sortOrder, setSortOrder] = useState(tool.sortOrder);
  const [seoTitle, setSeoTitle] = useState(tool.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(tool.seoDescription || "");
  const [seoKeywords, setSeoKeywords] = useState(tool.seoKeywords || "");
  const [canonicalUrl, setCanonicalUrl] = useState(tool.canonicalUrl || "");
  const [ogTitle, setOgTitle] = useState(tool.ogTitle || "");
  const [ogDescription, setOgDescription] = useState(tool.ogDescription || "");
  const [ogImage, setOgImage] = useState(tool.ogImage || "");
  const [robots, setRobots] = useState(tool.robots || "index,follow");
  const [heroHeading, setHeroHeading] = useState(content.heroHeading || "");
  const [heroSubheading, setHeroSubheading] = useState(content.heroSubheading || "");
  const [sectionsText, setSectionsText] = useState(
    (content.sections || []).map((s: { heading: string; body: string }) => `${s.heading}\n${s.body}`).join("\n\n---\n\n")
  );
  const [faqText, setFaqText] = useState(
    (content.faq || []).map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
  );

  const [cacheMinutes, setCacheMinutes] = useState(settings?.cacheMinutes ?? 10);
  const [currency, setCurrency] = useState(settings?.defaultCurrency ?? "USD");
  const [disclosure, setDisclosure] = useState(settings?.affiliateDisclosure ?? "");
  const [weights, setWeights] = useState(settings?.scoringWeights ?? { price: 40, renewal: 25, privacy: 10, features: 10, transfer: 10, other: 5 });

  const serpTitle = (seoTitle || name || "Untitled tool").slice(0, 60);
  const serpDesc = (seoDescription || shortDescription || "").slice(0, 160);

  const tabs = useMemo(() => (extraTabs ? [...TABS, "More" as const] : [...TABS]), [extraTabs]);

  async function save() {
    setSaving(true);
    try {
      const sections = sectionsText
        .split(/\n---\n/)
        .map((block: string) => block.trim())
        .filter(Boolean)
        .map((block: string) => {
          const [heading, ...rest] = block.split("\n");
          return { heading: heading.trim(), body: rest.join("\n").trim() };
        });
      const faq = faqText
        .split(/\n\s*\n/)
        .map((block: string) => {
          const q = block.match(/Q:\s*(.*)/i)?.[1]?.trim();
          const a = block.match(/A:\s*([\s\S]*)/i)?.[1]?.trim();
          return q && a ? { question: q, answer: a } : null;
        })
        .filter(Boolean);

      const payload: ToolInput = {
        id: tool.id,
        name,
        slug,
        shortDescription,
        longDescription,
        icon,
        categoryId: categoryId || null,
        status,
        isFeatured,
        isPublic,
        sortOrder: Number(sortOrder) || 0,
        toolUrl: `/free-tools/${slug || "tool"}`,
        seoTitle,
        seoDescription,
        seoKeywords,
        canonicalUrl,
        ogTitle,
        ogDescription,
        ogImage,
        robots,
        contentJson: JSON.stringify({ heroHeading, heroSubheading, sections, faq }),
      };
      const saved = await upsertTool(payload);
      if (settings) {
        await saveFreeToolsSettingsAdmin({
          ...settings,
          cacheMinutes,
          defaultCurrency: currency,
          affiliateDisclosure: disclosure,
          scoringWeights: weights,
        });
      }
      toast.success("Saved");
      if (isNew) router.push(`/admin/tools/${saved.slug}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white";
  const label = "block text-xs uppercase tracking-widest text-slate-500 mb-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${tab === item ? "bg-indigo-500/15 text-indigo-300" : "text-slate-400 hover:text-white"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-4 max-w-2xl">
          <label>
            <span className={label}>Name</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className={label}>Slug</span>
            <input className={field} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label>
            <span className={label}>Short description</span>
            <textarea className={field} rows={3} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </label>
          <label>
            <span className={label}>Category</span>
            <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className={label}>Status</span>
              <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              <span className={label}>Icon</span>
              <input className={field} value={icon} onChange={(e) => setIcon(e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public visibility
          </label>
        </div>
      )}

      {tab === "Settings" && (
        <div className="grid gap-4 max-w-2xl">
          <label>
            <span className={label}>Sort order</span>
            <input type="number" className={field} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </label>
          <label>
            <span className={label}>Long description</span>
            <textarea className={field} rows={5} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} />
          </label>
          {settings && (
            <>
              <label>
                <span className={label}>Default currency</span>
                <input className={field} value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </label>
              <label>
                <span className={label}>Cache duration (minutes)</span>
                <input type="number" className={field} value={cacheMinutes} onChange={(e) => setCacheMinutes(Number(e.target.value))} />
              </label>
              <label>
                <span className={label}>Affiliate disclosure</span>
                <textarea className={field} rows={3} value={disclosure} onChange={(e) => setDisclosure(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(weights).map(([key, value]) => (
                  <label key={key}>
                    <span className={label}>{key} weight</span>
                    <input
                      type="number"
                      className={field}
                      value={value}
                      onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
                    />
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "SEO" && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="grid gap-4">
            <label>
              <span className={label}>SEO title</span>
              <input className={field} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </label>
            <label>
              <span className={label}>SEO description</span>
              <textarea className={field} rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
            </label>
            <label>
              <span className={label}>SEO keywords</span>
              <input className={field} value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} />
            </label>
            <label>
              <span className={label}>Canonical URL</span>
              <input className={field} value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} />
            </label>
            <label>
              <span className={label}>OG title</span>
              <input className={field} value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} />
            </label>
            <label>
              <span className={label}>OG description</span>
              <textarea className={field} rows={2} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} />
            </label>
            <label>
              <span className={label}>OG image</span>
              <input className={field} value={ogImage} onChange={(e) => setOgImage(e.target.value)} />
            </label>
            <label>
              <span className={label}>Robots</span>
              <select className={field} value={robots} onChange={(e) => setRobots(e.target.value)}>
                <option value="index,follow">index,follow</option>
                <option value="noindex,follow">noindex,follow</option>
                <option value="noindex,nofollow">noindex,nofollow</option>
              </select>
            </label>
          </div>
          <div>
            <p className={label}>Google-style preview</p>
            <div className="rounded-xl border border-slate-800 bg-white p-4">
              <p className="text-[#1a0dab] text-xl leading-snug">{serpTitle} | karmakoders.com</p>
              <p className="text-[#006621] text-sm mt-1">www.karmakoders.com › free-tools › {slug || "slug"}</p>
              <p className="text-[#4d5156] text-sm mt-1">{serpDesc || "Add a 150–160 character description."}</p>
            </div>
          </div>
        </div>
      )}

      {tab === "Content" && (
        <div className="grid gap-4 max-w-3xl">
          <label>
            <span className={label}>Hero heading</span>
            <input className={field} value={heroHeading} onChange={(e) => setHeroHeading(e.target.value)} />
          </label>
          <label>
            <span className={label}>Hero subheading</span>
            <textarea className={field} rows={3} value={heroSubheading} onChange={(e) => setHeroSubheading(e.target.value)} />
          </label>
          <label>
            <span className={label}>Sections (heading, then HTML body, separated by ---)</span>
            <textarea className={`${field} font-mono text-sm`} rows={12} value={sectionsText} onChange={(e) => setSectionsText(e.target.value)} />
          </label>
          <label>
            <span className={label}>FAQ (Q: ... / A: ...)</span>
            <textarea className={`${field} font-mono text-sm`} rows={10} value={faqText} onChange={(e) => setFaqText(e.target.value)} />
          </label>
        </div>
      )}

      {tab === "More" && extraTabs}

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
