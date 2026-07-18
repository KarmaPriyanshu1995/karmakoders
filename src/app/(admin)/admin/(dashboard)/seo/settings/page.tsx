"use client";

import { useState } from "react";
import { Settings2, Save, ExternalLink } from "lucide-react";

export default function SeoSettingsPage() {
  const [settings, setSettings] = useState({
    siteUrl: "https://karmakoders.com",
    siteName: "Karmakoders",
    defaultOrgName: "Karmakoders",
    gscSiteUrl: "",
    gscClientId: "",
    gscClientSecret: "",
    gscRefreshToken: "",
    defaultLocale: "en",
    defaultCountry: "IN",
    indexingMode: "auto",
    schemaAutoApply: false,
    weeklyReports: true,
    auditFrequency: "weekly",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Field = ({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#FFC300]/30" />
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 mt-0.5 ${value ? "bg-[#FFC300]" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">SEO Settings</h2>
          <p className="text-slate-400 text-sm mt-1">Configure global SEO settings, API connections, and automation preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-bold text-green-400">✓ Settings saved</span>}
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Settings */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white flex items-center gap-2"><Settings2 className="w-4 h-4 text-[#FFC300]" /> Site Configuration</h3>
          <Field label="Site URL" value={settings.siteUrl} onChange={(v) => setSettings((p) => ({ ...p, siteUrl: v }))} placeholder="https://karmakoders.com" />
          <Field label="Site Name" value={settings.siteName} onChange={(v) => setSettings((p) => ({ ...p, siteName: v }))} placeholder="Karmakoders" />
          <Field label="Default Organization Name" value={settings.defaultOrgName} onChange={(v) => setSettings((p) => ({ ...p, defaultOrgName: v }))} />
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Default Locale</label>
            <select value={settings.defaultLocale} onChange={(e) => setSettings((p) => ({ ...p, defaultLocale: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30">
              <option value="en">English (en)</option>
              <option value="en-IN">English India (en-IN)</option>
              <option value="en-US">English US (en-US)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Primary Country</label>
            <select value={settings.defaultCountry} onChange={(e) => setSettings((p) => ({ ...p, defaultCountry: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30">
              <option value="IN">India (IN)</option>
              <option value="US">United States (US)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="AU">Australia (AU)</option>
            </select>
          </div>
        </div>

        {/* Google Search Console */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white">Google Search Console API</h3>
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#FFC300] hover:text-white flex items-center gap-1 transition-colors">
              Google Cloud <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <Field label="GSC Site URL" value={settings.gscSiteUrl} onChange={(v) => setSettings((p) => ({ ...p, gscSiteUrl: v }))} placeholder="https://karmakoders.com" />
          <Field label="Google Client ID" value={settings.gscClientId} onChange={(v) => setSettings((p) => ({ ...p, gscClientId: v }))} placeholder="From Google Cloud Console" />
          <Field label="Google Client Secret" type="password" value={settings.gscClientSecret} onChange={(v) => setSettings((p) => ({ ...p, gscClientSecret: v }))} placeholder="••••••••" />
          <Field label="OAuth Refresh Token" type="password" value={settings.gscRefreshToken} onChange={(v) => setSettings((p) => ({ ...p, gscRefreshToken: v }))} placeholder="••••••••" />
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300">
              <strong>How to get credentials:</strong> Go to Google Cloud Console → APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID. Then enable the Search Console API.
            </p>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="font-black text-white mb-4">Automation Preferences</h3>
          <Toggle
            label="Auto-apply Schema"
            desc="Automatically inject generated schema into pages"
            value={settings.schemaAutoApply}
            onChange={(v) => setSettings((p) => ({ ...p, schemaAutoApply: v }))}
          />
          <Toggle
            label="Weekly SEO Reports"
            desc="Generate and save weekly SEO health reports automatically"
            value={settings.weeklyReports}
            onChange={(v) => setSettings((p) => ({ ...p, weeklyReports: v }))}
          />
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Audit Frequency</label>
            <select value={settings.auditFrequency} onChange={(e) => setSettings((p) => ({ ...p, auditFrequency: e.target.value }))} className="w-full px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>
        </div>

        {/* SEO Information */}
        <div className="p-6 rounded-2xl bg-[#FFC300]/5 border border-[#FFC300]/10">
          <h3 className="font-black text-white mb-4">SEO Intelligence Center v1.0</h3>
          <div className="space-y-2 text-xs text-slate-400">
            <p>• 17 SEO modules covering all aspects of search optimization</p>
            <p>• Rule-based AI recommendations (no external API required)</p>
            <p>• JSON-LD schema generation and validation</p>
            <p>• Technical SEO audit engine</p>
            <p>• Entity detection and Knowledge Graph signals</p>
            <p>• Topical authority cluster mapping</p>
            <p>• CTR optimization with AI-generated titles/descriptions</p>
            <p>• Google Search Console integration (connect above)</p>
            <p>• Automated SEO issue detection and fixing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
