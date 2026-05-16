
"use client";

import { useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { toast } from "sonner";

export function ImagePreview({ initialUrl, name }: { initialUrl?: string | null, name: string }) {
  const [url, setUrl] = useState(initialUrl || "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Image URL
          </label>
          <input
            name={name}
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://images.pexels.com/..."
            className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-white focus:border-indigo-500 outline-none"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 ml-1 flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload from Computer
          </label>
          <div className="h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 flex items-center justify-center">
            <UploadButton
              endpoint="imageUploader"
              onClientUploadComplete={(res) => {
                if (res?.[0]) {
                  setUrl(res[0].url);
                  toast.success("Image uploaded successfully!");
                }
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
              appearance={{
                button: "bg-indigo-600 hover:bg-indigo-500 text-xs h-8 px-4",
                allowedContent: "hidden"
              }}
            />
          </div>
        </div>
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
            <span>No image selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
