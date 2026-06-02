"use client";

import { useState } from "react";
import { SchemaPreview } from "@/components/admin/seo/SchemaPreview";
import { Code2, Plus, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { SCHEMA_DESCRIPTIONS } from "@/lib/seo/schemaGenerator";

type SchemaType = "Organization" | "Website" | "Article" | "FAQ" | "Service" | "Breadcrumb" | "LocalBusiness" | "Person";

const SCHEMA_TEMPLATES: Record<SchemaType, Record<string, string>> = {
  Organization: { name: "Karmakoders", url: "https://karmakoders.com", description: "Expert web and mobile development company" },
  Website: { name: "Karmakoders", url: "https://karmakoders.com" },
  Article: { title: "Article Title", url: "https://karmakoders.com/blog/article", author: "Karmakoders Team" },
  FAQ: { questionsJson: '[{"question":"What services do you offer?","answer":"We offer web development, mobile app development, UI/UX design, and SEO services."}]' },
  Service: { name: "Web Development", url: "https://karmakoders.com/services/web-development", provider: "Karmakoders", providerUrl: "https://karmakoders.com" },
  Breadcrumb: { itemsJson: '[{"name":"Home","url":"https://karmakoders.com"},{"name":"Blog","url":"https://karmakoders.com/blog"}]' },
  LocalBusiness: { name: "Karmakoders", url: "https://karmakoders.com" },
  Person: { name: "Founder Name", jobTitle: "Founder & CEO" },
};

const SCHEMA_ICONS: Record<SchemaType, string> = {
  Organization: "🏢", Website: "🌐", Article: "📄", FAQ: "❓",
  Service: "⚙️", Breadcrumb: "🍞", LocalBusiness: "📍", Person: "👤",
};

export default function SchemaCenterPage() {
  const [selectedType, setSelectedType] = useState<SchemaType>("Organization");
  const [formData, setFormData] = useState<Record<string, string>>(SCHEMA_TEMPLATES.Organization);
  const [generatedSchema, setGeneratedSchema] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (type: SchemaType) => {
    setSelectedType(type);
    setFormData(SCHEMA_TEMPLATES[type]);
    setGeneratedSchema(null);
    setValidation(null);
  };

  const handleGenerate = async () => {
    setLoading(true);
    let data: Record<string, unknown> = { ...formData };
    if (formData.questionsJson) {
      try { data.questions = JSON.parse(formData.questionsJson); } catch { data.questions = []; }
    }
    if (formData.itemsJson) {
      try { data.items = JSON.parse(formData.itemsJson); } catch { data.items = []; }
    }
    const res = await fetch("/api/seo/schema/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaType: selectedType, data }),
    });
    const result = await res.json();
    setGeneratedSchema(result.json);
    setValidation(result.validation);
    setLoading(false);
  };

  const schemaTypes = Object.keys(SCHEMA_DESCRIPTIONS) as SchemaType[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Schema Center</h2>
        <p className="text-slate-400 text-sm mt-1">Generate, validate, and manage structured data for rich search results</p>
      </div>

      {/* Schema type selector */}
      <div>
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Select Schema Type</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {schemaTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`p-4 rounded-2xl border text-left transition-all ${selectedType === type ? "bg-[#FFC300]/10 border-[#FFC300]/30 text-[#FFC300]" : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"}`}
            >
              <div className="text-2xl mb-2">{SCHEMA_ICONS[type]}</div>
              <p className="text-sm font-black">{type}</p>
              <p className="text-xs mt-1 opacity-70 line-clamp-2">{SCHEMA_DESCRIPTIONS[type]}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#FFC300]" />
            {selectedType} Schema Generator
          </h3>
          {Object.entries(formData).map(([key, value]) => (
            <div key={key}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                {key.replace(/([A-Z])/g, " $1").replace(/Json$/, " (JSON)").trim()}
              </label>
              {key.includes("Json") ? (
                <textarea value={value} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-[#1C1B1A] border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#FFC300]/30 resize-none" />
              ) : (
                <input value={value} onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
              )}
            </div>
          ))}
          <button onClick={handleGenerate} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black hover:bg-[#FFD60A] transition-all disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : `Generate ${selectedType} Schema`}
          </button>
        </div>

        {/* Output */}
        <div className="space-y-4">
          {validation && (
            <div className={`flex items-center gap-2 p-4 rounded-xl border ${validation.valid ? "bg-green-500/10 border-green-500/20 text-green-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
              {validation.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm font-bold">{validation.valid ? "Schema is valid!" : `${validation.errors.length} validation error(s)`}</span>
            </div>
          )}
          {generatedSchema ? (
            <SchemaPreview
              schema={generatedSchema}
              title={`${selectedType} Schema`}
              isValid={validation?.valid ?? true}
              errors={validation?.errors || []}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white/3 border border-white/10 text-center">
              <Code2 className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-white font-bold">Schema Preview</p>
              <p className="text-slate-500 text-sm mt-1">Fill in the form and click Generate</p>
            </div>
          )}

          {/* Schema coverage tips */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Why This Schema?</h4>
            <p className="text-sm text-slate-400">{SCHEMA_DESCRIPTIONS[selectedType]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
