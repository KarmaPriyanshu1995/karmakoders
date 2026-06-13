"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle, Moon, Sun, Type, Square, LayoutTemplate } from "lucide-react";
import { getSiteConfig, setSiteConfig } from "@/lib/actions";

export default function AppearancePage() {
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [themeConfig, setThemeConfig] = useState({
    mode: "dark",
    bgType: "solid",
    bgGradient: "linear-gradient(to right, #020617, #0f172a)",
    bgColor: "#020617",
    textColor: "#f8fafc",
    primaryColor: "#4f46e5",
    fontFamily: "var(--font-inter)",
    borderRadius: "0.5rem", // md
  });

  useEffect(() => {
    async function loadConfig() {
      const config = await getSiteConfig("globalTheme");
      if (config) {
        const mode = config.mode || config.theme || "dark";
        setThemeConfig((prev) => ({ ...prev, ...config, mode }));
      }
      setIsLoading(false);
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setSiteConfig("globalTheme", themeConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-3xl pb-20">
      <div>
        <h2 className="text-2xl font-bold text-white">Appearance</h2>
        <p className="text-slate-400 mt-1">Customize the global look and feel of your website.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Base Theme */}
        <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <LayoutTemplate className="w-5 h-5 text-indigo-400" /> Base Theme Mode
            </h3>
            <p className="text-sm text-slate-400 mt-2">Sets the foundational mode.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setThemeConfig({ ...themeConfig, mode: "dark" })}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${themeConfig.mode === "dark" ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"}`}
            >
              <Moon className="w-5 h-5" />
              <span className="font-medium">Dark Mode Base</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeConfig({ ...themeConfig, mode: "light" })}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${themeConfig.mode === "light" ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"}`}
            >
              <Sun className="w-5 h-5" />
              <span className="font-medium">Light Mode Base</span>
            </button>
          </div>
        </div>

        {/* Colors & Background */}
        <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Square className="w-5 h-5 text-indigo-400" /> Colors & Background
          </h3>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Background Type</label>
              <select
                value={themeConfig.bgType}
                onChange={(e) => setThemeConfig({ ...themeConfig, bgType: e.target.value })}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="solid">Solid Color</option>
                <option value="gradient">Linear Gradient</option>
              </select>
            </div>

            {themeConfig.bgType === "solid" ? (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeConfig.bgColor}
                    onChange={(e) => setThemeConfig({ ...themeConfig, bgColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer bg-slate-950 border border-slate-800 p-1"
                  />
                  <span className="text-sm text-slate-300 font-mono">{themeConfig.bgColor}</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Gradient CSS</label>
                <input
                  type="text"
                  value={themeConfig.bgGradient}
                  onChange={(e) => setThemeConfig({ ...themeConfig, bgGradient: e.target.value })}
                  placeholder="linear-gradient(to right, red, blue)"
                  className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
            )}
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Text Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeConfig.textColor}
                  onChange={(e) => setThemeConfig({ ...themeConfig, textColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer bg-slate-950 border border-slate-800 p-1"
                />
                <span className="text-sm text-slate-300 font-mono">{themeConfig.textColor}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Primary Accent</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={themeConfig.primaryColor}
                  onChange={(e) => setThemeConfig({ ...themeConfig, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer bg-slate-950 border border-slate-800 p-1"
                />
                <span className="text-sm text-slate-300 font-mono">{themeConfig.primaryColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Shapes */}
        <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Type className="w-5 h-5 text-indigo-400" /> Typography & Shapes
          </h3>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Font Family</label>
              <select
                value={themeConfig.fontFamily}
                onChange={(e) => setThemeConfig({ ...themeConfig, fontFamily: e.target.value })}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="var(--font-inter)">Inter (Modern Sans)</option>
                <option value="var(--font-outfit)">Outfit (Tech)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Border Radius</label>
              <select
                value={themeConfig.borderRadius}
                onChange={(e) => setThemeConfig({ ...themeConfig, borderRadius: e.target.value })}
                className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="0px">Sharp (0px)</option>
                <option value="0.25rem">Small (4px)</option>
                <option value="0.5rem">Medium (8px)</option>
                <option value="0.75rem">Large (12px)</option>
                <option value="1rem">Extra Large (16px)</option>
                <option value="9999px">Pill (9999px)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all"
          >
            <Save className="w-4 h-4" />
            Save Appearance
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Appearance updated!
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
