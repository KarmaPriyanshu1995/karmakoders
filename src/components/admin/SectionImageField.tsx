"use client";

import { ImageIcon, X } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { toast } from "sonner";

interface SectionImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export function SectionImageField({ value, onChange, placeholder }: SectionImageFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "https://... or upload from computer"}
          className="flex-1 h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-sm text-white focus:border-indigo-500 outline-none"
        />
        <div className="h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 flex items-center justify-center shrink-0">
          <UploadButton
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              if (res?.[0]) {
                onChange(res[0].url);
                toast.success("Image uploaded successfully!");
              }
            }}
            onUploadError={(error: Error) => {
              toast.error(`Upload failed: ${error.message}`);
            }}
            appearance={{
              button: "bg-indigo-600 hover:bg-indigo-500 text-xs h-8 px-3 flex items-center gap-1.5",
              allowedContent: "hidden",
            }}
          />
        </div>
      </div>

      <div className="relative aspect-video max-h-40 rounded-lg overflow-hidden border border-slate-800 bg-slate-900/50 flex items-center justify-center">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Section preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://placehold.co/600x400/1e293b/4f46e5?text=Invalid+Image";
              }}
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-slate-600 text-xs flex flex-col items-center gap-1.5 py-6">
            <ImageIcon className="w-6 h-6 opacity-30" />
            <span>No image — paste a URL or upload from your computer</span>
          </div>
        )}
      </div>
    </div>
  );
}
