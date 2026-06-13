"use client";

import { useEffect, useState } from "react";
import { Star, Save, Plus, Trash2, Globe, Link, GitBranch } from "lucide-react";
import { SchemaPreview } from "@/components/admin/seo/SchemaPreview";
import { ScoreGauge } from "@/components/admin/seo/ScoreGauge";

interface BrandData {
  id?: string;
  brandName: string;
  businessName: string;
  tagline: string;
  websiteUrl: string;
  founderName: string;
  founderTitle: string;
  founderBio: string;
  services: string[];
  locations: string[];
  socials: { twitter?: string; linkedin?: string; github?: string; facebook?: string };
  industryKeywords: string;
  brandScore?: number;
  schemaJson?: string;
}

const EMPTY_BRAND: BrandData = {
  brandName: "Karmakoders",
  businessName: "",
  tagline: "",
  websiteUrl: "https://karmakoders.com",
  founderName: "",
  founderTitle: "Founder & CEO",
  founderBio: "",
  services: [],
  locations: [],
  socials: {},
  industryKeywords: "",
};

export default function BrandAuthorityPage() {
  const [brand, setBrand] = useState<BrandData>(EMPTY_BRAND);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newService, setNewService] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [schema, setSchema] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/seo/brand")
      .then((r) => r.json())
      .then((d) => {
        if (d.brand) {
          setBrand({
            ...EMPTY_BRAND,
            ...d.brand,
            services: d.brand.servicesJson ? JSON.parse(d.brand.servicesJson) : [],
            locations: d.brand.locationsJson ? JSON.parse(d.brand.locationsJson) : [],
            socials: d.brand.socialProfilesJson ? JSON.parse(d.brand.socialProfilesJson) : {},
          });
          if (d.brand.schemaJson) setSchema(d.brand.schemaJson);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/seo/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: brand.brandName,
        businessName: brand.businessName,
        tagline: brand.tagline,
        websiteUrl: brand.websiteUrl,
        founderName: brand.founderName,
        founderTitle: brand.founderTitle,
        founderBio: brand.founderBio,
        services: JSON.stringify(brand.services),
        locations: JSON.stringify(brand.locations),
        socials: JSON.stringify(brand.socials),
        industryKeywords: brand.industryKeywords,
      }),
    });
    const data = await res.json();
    if (data.brand) setBrand((p) => ({ ...p, brandScore: data.brand.brandScore }));
    if (data.schema) setSchema(JSON.stringify(data.schema, null, 2));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Field = ({ label, value, onChange, placeholder, multiline = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) => (
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30 resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Brand Authority Center</h2>
          <p className="text-slate-400 text-sm mt-1">Strengthen your brand entity signals for Google Knowledge Graph</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-bold text-green-400">✓ Saved successfully</span>}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-60 shadow-[0_0_20px_rgba(255,195,0,0.3)]">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save & Generate Schema"}
          </button>
        </div>
      </div>

      {/* Brand score */}
      {brand.brandScore !== undefined && (
        <div className="flex items-center gap-6 p-5 rounded-2xl bg-white/5 border border-white/10">
          <ScoreGauge score={brand.brandScore} size="sm" label="Brand Authority Score" />
          <div>
            <p className="text-white font-bold mb-1">Brand Authority: {brand.brandScore}/100</p>
            <p className="text-xs text-slate-400">Complete all fields below to maximize your brand authority score and Knowledge Graph signals</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand info */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white flex items-center gap-2"><Star className="w-4 h-4 text-[#FFC300]" /> Brand Information</h3>
          <Field label="Brand Name *" value={brand.brandName} onChange={(v) => setBrand((p) => ({ ...p, brandName: v }))} placeholder="Karmakoders" />
          <Field label="Business/Legal Name" value={brand.businessName} onChange={(v) => setBrand((p) => ({ ...p, businessName: v }))} placeholder="Karmakoders Pvt. Ltd." />
          <Field label="Tagline / Value Proposition" value={brand.tagline} onChange={(v) => setBrand((p) => ({ ...p, tagline: v }))} placeholder="Building exceptional digital products" />
          <Field label="Website URL *" value={brand.websiteUrl} onChange={(v) => setBrand((p) => ({ ...p, websiteUrl: v }))} placeholder="https://karmakoders.com" />
          <Field label="Industry Keywords (comma separated)" value={brand.industryKeywords} onChange={(v) => setBrand((p) => ({ ...p, industryKeywords: v }))} placeholder="web development, React, Next.js, Laravel" />
        </div>

        {/* Founder info */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white">Founder / Team</h3>
          <Field label="Founder Name" value={brand.founderName} onChange={(v) => setBrand((p) => ({ ...p, founderName: v }))} placeholder="Your name" />
          <Field label="Founder Title" value={brand.founderTitle} onChange={(v) => setBrand((p) => ({ ...p, founderTitle: v }))} placeholder="Founder & CEO" />
          <Field label="Founder Bio" value={brand.founderBio} onChange={(v) => setBrand((p) => ({ ...p, founderBio: v }))} placeholder="Professional bio for E-E-A-T signals..." multiline />
        </div>

        {/* Social profiles */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white">Social Profiles</h3>
          {[
            { key: "twitter", icon: Globe, placeholder: "https://twitter.com/karmakoders" },
            { key: "linkedin", icon: Link, placeholder: "https://linkedin.com/company/karmakoders" },
            { key: "github", icon: GitBranch, placeholder: "https://github.com/karmakoders" },
            { key: "website", icon: Globe, placeholder: "https://karmakoders.com" },
          ].map((social) => (
            <div key={social.key} className="flex items-center gap-3">
              <social.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                value={brand.socials[social.key as keyof typeof brand.socials] || ""}
                onChange={(e) => setBrand((p) => ({ ...p, socials: { ...p.socials, [social.key]: e.target.value } }))}
                placeholder={social.placeholder}
                className="flex-1 px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30"
              />
            </div>
          ))}
        </div>

        {/* Services + Locations */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
          <div>
            <h3 className="font-black text-white mb-3">Services</h3>
            <div className="flex gap-2 mb-3">
              <input value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newService) { setBrand((p) => ({ ...p, services: [...p.services, newService] })); setNewService(""); } }} placeholder="Add service..." className="flex-1 px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
              <button onClick={() => { if (newService) { setBrand((p) => ({ ...p, services: [...p.services, newService] })); setNewService(""); } }} className="p-2 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 text-[#FFC300] hover:bg-[#FFC300]/20 transition-all"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {brand.services.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#FFC300]/10 text-[#FFC300] border border-[#FFC300]/20">
                  {s}
                  <button onClick={() => setBrand((p) => ({ ...p, services: p.services.filter((_, j) => j !== i) }))} className="hover:text-white transition-colors ml-1"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-black text-white mb-3">Locations Served</h3>
            <div className="flex gap-2 mb-3">
              <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newLocation) { setBrand((p) => ({ ...p, locations: [...p.locations, newLocation] })); setNewLocation(""); } }} placeholder="Add location..." className="flex-1 px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
              <button onClick={() => { if (newLocation) { setBrand((p) => ({ ...p, locations: [...p.locations, newLocation] })); setNewLocation(""); } }} className="p-2 rounded-xl bg-[#FFC300]/10 border border-[#FFC300]/20 text-[#FFC300] hover:bg-[#FFC300]/20 transition-all"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {brand.locations.map((l, i) => (
                <span key={i} className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {l}
                  <button onClick={() => setBrand((p) => ({ ...p, locations: p.locations.filter((_, j) => j !== i) }))} className="hover:text-white transition-colors ml-1"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generated Schema */}
      {schema && (
        <div>
          <h3 className="font-black text-white mb-4">Generated Knowledge Graph Schema</h3>
          <SchemaPreview schema={schema} title="Organization + Person + Website Schema" isValid />
        </div>
      )}
    </div>
  );
}
