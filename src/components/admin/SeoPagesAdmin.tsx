"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { upsertSeoLandingPage, upsertDomainExtension, upsertRegistrarComparison } from "@/lib/tool-actions";

export function SeoPagesAdmin({
  landings,
  tlds,
  comparisons,
  providers,
}: {
  landings: { id: string; slug: string; title: string; status: string; pageType: string; content: string; seoTitle: string | null; seoDescription: string | null }[];
  tlds: { id: string; tld: string; name: string; status: string; description: string | null; content: string | null; seoTitle: string | null; seoDescription: string | null }[];
  comparisons: { id: string; slug: string; title: string; status: string; providerAId: string; providerBId: string; content: string | null; seoTitle: string | null; seoDescription: string | null }[];
  providers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"landing" | "tld" | "compare">("landing");
  const field = "px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white w-full";

  const [landing, setLanding] = useState({ slug: "", pageType: "custom", title: "", content: "", seoTitle: "", seoDescription: "", status: "draft" });
  const [tld, setTld] = useState({ tld: "", name: "", description: "", content: "", seoTitle: "", seoDescription: "", status: "draft" });
  const [compare, setCompare] = useState({
    title: "",
    slug: "",
    providerAId: providers[0]?.id || "",
    providerBId: providers[1]?.id || providers[0]?.id || "",
    content: "",
    seoTitle: "",
    seoDescription: "",
    status: "draft",
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[
          ["landing", "Landing pages"],
          ["tld", "TLD pages"],
          ["compare", "Registrar comparisons"],
        ].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id as typeof tab)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === id ? "bg-indigo-500/15 text-indigo-300" : "text-slate-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "landing" && (
        <div className="grid md:grid-cols-2 gap-8">
          <ul className="space-y-2 text-sm">
            {landings.map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <p className="text-white font-medium">{item.title}</p>
                <p className="text-slate-500">/{item.slug} · {item.status}</p>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await upsertSeoLandingPage(landing);
                toast.success("Landing page saved");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed");
              }
            }}
          >
            <input className={field} placeholder="Slug" value={landing.slug} onChange={(e) => setLanding({ ...landing, slug: e.target.value })} />
            <input className={field} placeholder="Title" value={landing.title} onChange={(e) => setLanding({ ...landing, title: e.target.value })} />
            <input className={field} placeholder="Page type" value={landing.pageType} onChange={(e) => setLanding({ ...landing, pageType: e.target.value })} />
            <textarea className={field} rows={6} placeholder="HTML content" value={landing.content} onChange={(e) => setLanding({ ...landing, content: e.target.value })} />
            <input className={field} placeholder="SEO title" value={landing.seoTitle} onChange={(e) => setLanding({ ...landing, seoTitle: e.target.value })} />
            <input className={field} placeholder="SEO description" value={landing.seoDescription} onChange={(e) => setLanding({ ...landing, seoDescription: e.target.value })} />
            <select className={field} value={landing.status} onChange={(e) => setLanding({ ...landing, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit">Save landing page</Button>
          </form>
        </div>
      )}

      {tab === "tld" && (
        <div className="grid md:grid-cols-2 gap-8">
          <ul className="space-y-2 text-sm">
            {tlds.map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <p className="text-white font-medium">{item.name}</p>
                <p className="text-slate-500">/domains/{item.tld} · {item.status}</p>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await upsertDomainExtension(tld);
                toast.success("TLD page saved");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed");
              }
            }}
          >
            <input className={field} placeholder="tld (com)" value={tld.tld} onChange={(e) => setTld({ ...tld, tld: e.target.value })} />
            <input className={field} placeholder="Name" value={tld.name} onChange={(e) => setTld({ ...tld, name: e.target.value })} />
            <textarea className={field} rows={2} placeholder="Description" value={tld.description} onChange={(e) => setTld({ ...tld, description: e.target.value })} />
            <textarea className={field} rows={6} placeholder="HTML content" value={tld.content} onChange={(e) => setTld({ ...tld, content: e.target.value })} />
            <select className={field} value={tld.status} onChange={(e) => setTld({ ...tld, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit">Save TLD page</Button>
          </form>
        </div>
      )}

      {tab === "compare" && (
        <div className="grid md:grid-cols-2 gap-8">
          <ul className="space-y-2 text-sm">
            {comparisons.map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <p className="text-white font-medium">{item.title}</p>
                <p className="text-slate-500">/compare/{item.slug} · {item.status}</p>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await upsertRegistrarComparison(compare);
                toast.success("Comparison saved");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed");
              }
            }}
          >
            <input className={field} placeholder="Title" value={compare.title} onChange={(e) => setCompare({ ...compare, title: e.target.value })} />
            <input className={field} placeholder="Slug (optional)" value={compare.slug} onChange={(e) => setCompare({ ...compare, slug: e.target.value })} />
            <select className={field} value={compare.providerAId} onChange={(e) => setCompare({ ...compare, providerAId: e.target.value })}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select className={field} value={compare.providerBId} onChange={(e) => setCompare({ ...compare, providerBId: e.target.value })}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <textarea className={field} rows={6} placeholder="HTML content" value={compare.content} onChange={(e) => setCompare({ ...compare, content: e.target.value })} />
            <select className={field} value={compare.status} onChange={(e) => setCompare({ ...compare, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <Button type="submit">Save comparison</Button>
          </form>
        </div>
      )}
    </div>
  );
}
