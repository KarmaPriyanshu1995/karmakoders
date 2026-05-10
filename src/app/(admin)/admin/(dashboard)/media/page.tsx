"use client";

import { useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { Image as ImageIcon, Trash2, Copy, Check } from "lucide-react";

export default function MediaLibraryPage() {
  const [uploads, setUploads] = useState<{ url: string; name: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const removeUpload = (url: string) => {
    setUploads((prev) => prev.filter((u) => u.url !== url));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Media Library</h2>
          <p className="text-slate-400 mt-1">Upload and manage your images and media files</p>
        </div>

        <UploadButton<OurFileRouter, "imageUploader">
          endpoint="imageUploader"
          onClientUploadComplete={(res) => {
            if (res) {
              setUploads((prev) => [
                ...res.map((f) => ({ url: f.url, name: f.name })),
                ...prev,
              ]);
            }
          }}
          onUploadError={(error: Error) => {
            alert(`Upload Error: ${error.message}`);
          }}
          appearance={{
            button:
              "px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full transition-all",
            allowedContent: "text-slate-500 text-xs",
          }}
        />
      </div>

      {uploads.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center border border-dashed border-slate-700">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No media uploaded yet</p>
          <p className="text-slate-600 text-sm mt-2">
            Use the Upload button above to add images to your media library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {uploads.map((file) => (
            <div
              key={file.url}
              className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-square"
            >
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <p className="text-white text-xs font-medium text-center truncate w-full px-2">
                  {file.name}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyUrl(file.url)}
                    className="p-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white transition-colors"
                    title="Copy URL"
                  >
                    {copied === file.url ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeUpload(file.url)}
                    className="p-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
