
"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function ImagePreview({ initialUrl, name }: { initialUrl?: string, name: string }) {
  const [url, setUrl] = useState(initialUrl || "");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Preview Image URL
        </label>
        <input
          name={name}
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://images.pexels.com/photos/..."
          className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
        />
      </div>
      
      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 flex items-center justify-center">
        {url ? (
          <img 
            src={url} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400/1e293b/4f46e5?text=Invalid+Image+URL";
            }}
          />
        ) : (
          <div className="text-slate-600 text-sm flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 opacity-20" />
            <span>No image URL provided</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 px-1">
        Tip: Make sure the URL ends with .jpg, .png, or .webp. For Pexels, right-click the image and select "Copy Image Address".
      </p>
    </div>
  );
}
