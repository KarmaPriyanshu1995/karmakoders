"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SectionContentEditorProps {
  type: string;
  content: Record<string, unknown>;
  onSave: (newContent: Record<string, unknown>) => void;
  onClose: () => void;
}

export function SectionContentEditor({ type, content, onSave, onClose }: SectionContentEditorProps) {
  const [formData, setFormData] = useState(content);

  const handleChange = (key: string, value: unknown) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
  };

  const renderFields = () => {
    switch (type) {
      case "hero":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Badge</label>
              <input value={(formData.badge as string) || ""} onChange={(e) => handleChange("badge", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Headline</label>
              <input value={(formData.headline as string) || ""} onChange={(e) => handleChange("headline", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Highlight Word</label>
              <input value={(formData.highlight as string) || ""} onChange={(e) => handleChange("highlight", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subheadline</label>
              <textarea value={(formData.subheadline as string) || ""} onChange={(e) => handleChange("subheadline", e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none" />
            </div>
          </div>
        );
      case "about":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tagline</label>
              <input value={(formData.tagline as string) || ""} onChange={(e) => handleChange("tagline", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Heading</label>
              <input value={(formData.heading as string) || ""} onChange={(e) => handleChange("heading", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Body Text</label>
              <textarea value={(formData.body as string) || ""} onChange={(e) => handleChange("body", e.target.value)} className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none" />
            </div>
          </div>
        );
      case "content":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tagline</label>
              <input value={(formData.tagline as string) || ""} onChange={(e) => handleChange("tagline", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Heading</label>
              <input value={(formData.heading as string) || ""} onChange={(e) => handleChange("heading", e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Body (HTML supported)</label>
              <textarea value={(formData.body as string) || ""} onChange={(e) => handleChange("body", e.target.value)} className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none" />
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
             <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-400 text-sm">
                Advanced editor for <b>{type}</b> section coming soon. Use raw JSON for now.
             </div>
             <textarea 
               value={JSON.stringify(formData, null, 2)} 
               onChange={(e) => {
                 try {
                   setFormData(JSON.parse(e.target.value));
                 } catch (err) {}
               }} 
               className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-mono focus:border-indigo-500 outline-none resize-none" 
             />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Edit {type} Content</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {renderFields()}
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6" onClick={() => onSave(formData)}>
            Update Section
          </Button>
        </div>
      </div>
    </div>
  );
}
