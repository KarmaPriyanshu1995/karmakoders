"use client";

import { useState } from "react";
import { CheckCircle, Plus, Save, Trash2 } from "lucide-react";
import { setSiteConfig } from "@/lib/actions";
import { type SiteContent } from "@/lib/site-content";
import { toast } from "sonner";

const inputClass =
  "w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none";
const areaClass =
  "w-full min-h-[88px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none";

export function SiteContentForm({ initial }: { initial: SiteContent }) {
  const [content, setContent] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setSiteConfig("publicContent", content);
    setSaved(true);
    toast.success("Saved. Refresh the public site to see it.");
    window.setTimeout(() => setSaved(false), 3000);
  };

  const field = (label: string, value: string, onChange: (value: string) => void, placeholder = "") => (
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} mt-2 font-medium normal-case tracking-normal`}
      />
    </label>
  );

  return (
    <div className="space-y-8 max-w-4xl pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white">Site Content</h2>
        <p className="text-slate-400 mt-1">
          Edit testimonials, logos, prices, phones, and Cal.com here. Save — no code deploy needed. The public site reads this from the database.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-3">Brand & contact</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {field("Legal name", content.brand.legalName, (v) => setContent({ ...content, brand: { ...content.brand, legalName: v } }))}
            {field("Public email", content.brand.email, (v) => setContent({ ...content, brand: { ...content.brand, email: v } }))}
            {field("Hours", content.brand.hours, (v) => setContent({ ...content, brand: { ...content.brand, hours: v } }))}
            {field("Address", content.brand.address, (v) => setContent({ ...content, brand: { ...content.brand, address: v } }))}
            {field("India phone", content.brand.inPhoneDisplay, (v) => setContent({ ...content, brand: { ...content.brand, inPhoneDisplay: v } }))}
            {field("India tel link", content.brand.inPhoneTel, (v) => setContent({ ...content, brand: { ...content.brand, inPhoneTel: v } }), "+918690071861")}
            {field("US phone (shown first)", content.brand.usPhoneDisplay, (v) => setContent({ ...content, brand: { ...content.brand, usPhoneDisplay: v } }), "+1 …")}
            {field("WhatsApp number", content.brand.whatsapp, (v) => setContent({ ...content, brand: { ...content.brand, whatsapp: v } }), "918690071861")}
            {field("Cal.com / Calendly URL", content.brand.calUrl, (v) => setContent({ ...content, brand: { ...content.brand, calUrl: v } }), "https://cal.com/your-name")}
          </div>
        </section>

        <section className="rounded-xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-3">Client logos</h3>
          {field("Strip label", content.logoLabel, (v) => setContent({ ...content, logoLabel: v }))}
          <div className="space-y-2">
            {content.logos.map((logo, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={logo.name}
                  onChange={(e) => {
                    const logos = [...content.logos];
                    logos[i] = { name: e.target.value };
                    setContent({ ...content, logos });
                  }}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setContent({ ...content, logos: content.logos.filter((_, idx) => idx !== i) })}
                  className="px-3 text-rose-400"
                  aria-label="Remove logo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContent({ ...content, logos: [...content.logos, { name: "New client" }] })}
              className="inline-flex items-center gap-2 text-sm text-indigo-400"
            >
              <Plus className="w-4 h-4" /> Add logo
            </button>
          </div>
        </section>

        <section className="rounded-xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-3">Testimonials</h3>
          {content.testimonials.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-800 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-white">Quote {i + 1}</p>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, testimonials: content.testimonials.filter((_, idx) => idx !== i) })}
                  className="text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={item.quote}
                onChange={(e) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, quote: e.target.value };
                  setContent({ ...content, testimonials });
                }}
                className={areaClass}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                {field("Name", item.name, (v) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, name: v };
                  setContent({ ...content, testimonials });
                })}
                {field("Role", item.role, (v) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, role: v };
                  setContent({ ...content, testimonials });
                })}
                {field("Company", item.company, (v) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, company: v };
                  setContent({ ...content, testimonials });
                })}
                {field("Country", item.country, (v) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, country: v };
                  setContent({ ...content, testimonials });
                })}
                {field("LinkedIn URL", item.linkedin || "", (v) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, linkedin: v };
                  setContent({ ...content, testimonials });
                })}
                {field("Video URL (optional)", item.videoUrl || "", (v) => {
                  const testimonials = [...content.testimonials];
                  testimonials[i] = { ...item, videoUrl: v };
                  setContent({ ...content, testimonials });
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setContent({
                ...content,
                testimonials: [
                  ...content.testimonials,
                  { quote: "", name: "", role: "", company: "", country: "" },
                ],
              })
            }
            className="inline-flex items-center gap-2 text-sm text-indigo-400"
          >
            <Plus className="w-4 h-4" /> Add testimonial
          </button>
        </section>

        <section className="rounded-xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-slate-800 pb-3">Pricing</h3>
          {field("Disclaimer", content.pricing.disclaimer, (v) =>
            setContent({ ...content, pricing: { ...content.pricing, disclaimer: v } }),
          )}
          {content.pricing.tiers.map((tier, i) => (
            <div key={tier.id} className="rounded-lg border border-slate-800 p-4 space-y-3">
              <p className="text-sm font-bold text-white">{tier.name}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {field("Starting from", tier.from, (v) => {
                  const tiers = [...content.pricing.tiers];
                  tiers[i] = { ...tier, from: v };
                  setContent({ ...content, pricing: { ...content.pricing, tiers } });
                })}
                {field("Typical range", tier.typical, (v) => {
                  const tiers = [...content.pricing.tiers];
                  tiers[i] = { ...tier, typical: v };
                  setContent({ ...content, pricing: { ...content.pricing, tiers } });
                })}
              </div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Features (one per line)
                <textarea
                  value={tier.features.join("\n")}
                  onChange={(e) => {
                    const tiers = [...content.pricing.tiers];
                    tiers[i] = { ...tier, features: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) };
                    setContent({ ...content, pricing: { ...content.pricing, tiers } });
                  }}
                  className={`${areaClass} mt-2 font-medium normal-case tracking-normal`}
                />
              </label>
            </div>
          ))}
          <div className="grid sm:grid-cols-2 gap-3">
            {field("Retainer name", content.pricing.retainer.name, (v) =>
              setContent({ ...content, pricing: { ...content.pricing, retainer: { ...content.pricing.retainer, name: v } } }),
            )}
            {field("Retainer from", content.pricing.retainer.from, (v) =>
              setContent({ ...content, pricing: { ...content.pricing, retainer: { ...content.pricing.retainer, from: v } } }),
            )}
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full"
          >
            <Save className="w-4 h-4" />
            Save site content
          </button>
          {saved ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Live on the public site after refresh
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
