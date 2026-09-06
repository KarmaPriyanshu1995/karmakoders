"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  ImageDown,
  Loader2,
  Shield,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ACCEPTED_EXTENSIONS,
  compressImageFile,
  formatBytes,
  isAcceptedImage,
  MAX_COMPRESS_BYTES,
  type CompressMode,
  type CompressOutputFormat,
} from "@/lib/tools/compress-image-client";

const ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

export function CompressImageTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("compressed_image");
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState<CompressOutputFormat>("auto");
  const [resize, setResize] = useState(true);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1920);
  const [preserveMetadata, setPreserveMetadata] = useState(false);
  const [mode, setMode] = useState<CompressMode>("balanced");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [stats, setStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
    originalWidth: number;
    originalHeight: number;
    outputWidth: number;
    outputHeight: number;
    outputFormat: string;
    processingTimeMs: number;
  } | null>(null);

  useEffect(() => {
    if (!retryUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  useEffect(() => {
    if (retryUntil && Date.now() >= retryUntil) {
      setRetryUntil(null);
      setError(null);
      setStatus("You can compress again now.");
    }
  }, [retryUntil, now]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    };
  }, [originalUrl, compressedUrl]);

  const retryRemaining = retryUntil ? Math.max(0, Math.ceil((retryUntil - now) / 1000)) : 0;
  const blocked = retryRemaining > 0;

  const pickFile = (next: File | null) => {
    if (!next) return;
    if (!isAcceptedImage(next)) {
      toast.error("Please choose a JPG, PNG, or WebP image.");
      setError("Please choose a JPG, PNG, or WebP image.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (next.size > MAX_COMPRESS_BYTES) {
      toast.error("Image must be 10 MB or smaller.");
      setError("Image must be 10 MB or smaller.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setFile(next);
    setOriginalUrl(URL.createObjectURL(next));
    setCompressedUrl(null);
    setStats(null);
    setDownloadName("compressed_image");
    setError(null);
    setStatus(null);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    pickFile(event.dataTransfer.files[0] ?? null);
  };

  const clearImage = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    setFile(null);
    setOriginalUrl(null);
    setCompressedUrl(null);
    setStats(null);
    setDownloadName("compressed_image");
    setError(null);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || blocked) return;

    setLoading(true);
    setError(null);
    setStatus("Compressing…");

    const result = await compressImageFile({
      file,
      quality,
      outputFormat,
      resize,
      maxWidth,
      maxHeight,
      preserveMetadata,
      mode,
    });

    if (!result.ok) {
      if (result.status === 429 && result.retryAfterSeconds) {
        setRetryUntil(Date.now() + result.retryAfterSeconds * 1000);
        toast.error("Something went wrong");
        setError(result.message);
      } else {
        toast.error("Something went wrong");
        setError("Something went wrong");
      }
      setStatus(null);
      setLoading(false);
      return;
    }

    if (compressedUrl) URL.revokeObjectURL(compressedUrl);
    const url = URL.createObjectURL(result.blob);
    setCompressedUrl(url);
    setDownloadName(result.stats.filename);
    setStats(result.stats);
    setStatus("Compression complete. Preview the result, then download if it looks right.");
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-950 to-indigo-950/40 p-6 md:p-8 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={onSubmit} className="relative space-y-6">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-widest">
            <ImageDown className="w-4 h-4" />
            JPG · PNG · WebP · 10 MB max
          </div>

          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/30 px-6 py-10 text-center cursor-pointer hover:border-indigo-500/40 hover:bg-black/40 transition-colors"
          >
            <Upload className="w-8 h-8 text-indigo-300" />
            <span className="text-white font-semibold">{file ? file.name : "Choose an image or drop it here"}</span>
            <span className="text-sm text-slate-500">
              {file ? formatBytes(file.size) : `Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}`}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Quality <span className="text-indigo-300">{quality}</span>
              </span>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Output format</span>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as CompressOutputFormat)}
                className="w-full h-11 rounded-xl bg-black/40 border border-white/10 text-white px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="auto">Auto (keep original)</option>
                <option value="jpg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Mode</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as CompressMode)}
                className="w-full h-11 rounded-xl bg-black/40 border border-white/10 text-white px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="quality">Quality</option>
                <option value="balanced">Balanced</option>
                <option value="maximum">Maximum</option>
              </select>
            </label>

            <label className="flex items-center gap-3 h-11 px-3 rounded-xl bg-black/40 border border-white/10 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={resize}
                onChange={(e) => setResize(e.target.checked)}
                className="accent-indigo-500"
              />
              Resize to fit max size
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Max width</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={maxWidth}
                disabled={!resize}
                onChange={(e) => setMaxWidth(Number(e.target.value) || 1)}
                className="w-full h-11 rounded-xl bg-black/40 border border-white/10 text-white px-3 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Max height</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={maxHeight}
                disabled={!resize}
                onChange={(e) => setMaxHeight(Number(e.target.value) || 1)}
                className="w-full h-11 rounded-xl bg-black/40 border border-white/10 text-white px-3 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={preserveMetadata}
              onChange={(e) => setPreserveMetadata(e.target.checked)}
              className="accent-indigo-500"
            />
            Preserve metadata (off by default)
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={loading || !file || blocked}
              className={`h-14 px-8 rounded-2xl font-bold text-base bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 hover:opacity-90 shadow-lg shadow-amber-500/20 ${loading || !file || blocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Compressing…
                </>
              ) : blocked ? (
                `Wait ${retryRemaining}s`
              ) : (
                "Compress now"
              )}
            </Button>
            {compressedUrl && (
              <a
                href={compressedUrl}
                download={downloadName}
                className="inline-flex items-center justify-center h-14 px-8 rounded-2xl font-bold text-base border border-white/10 bg-white/5 text-white hover:border-indigo-500/40 hover:bg-white/10 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Download
              </a>
            )}
            {file && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearImage}
                disabled={loading}
                className="h-14 px-8 rounded-2xl font-bold text-base text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Remove image
              </Button>
            )}
          </div>
        </form>
      </div>

      {!file && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, title: "Real API compression", desc: "Posts multipart files to /api/v1/compress — the same FastAPI service behind this tool." },
            { icon: ImageDown, title: "Before & after", desc: "See original vs compressed size, dimensions, format, and processing time." },
            { icon: Shield, title: "Nothing stored", desc: "Images are processed and deleted. Rate limit: 3 compressions per minute." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <item.icon className="w-5 h-5 text-indigo-300 mb-3" />
              <p className="font-semibold text-white text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-amber-200 text-sm">
          {blocked
            ? `You've reached the free limit of 3 compressions per minute. Please wait ${retryRemaining} seconds and try again.`
            : error}
        </p>
      )}
      {status && !error && (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-emerald-200 text-sm">{status}</p>
      )}

      {(originalUrl || compressedUrl) && (
        <div className="grid md:grid-cols-2 gap-6">
          <figure className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <figcaption className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Original</figcaption>
            {originalUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={originalUrl} alt="Original preview" className="w-full rounded-xl max-h-80 object-contain bg-black/40" />
            ) : null}
            <p className="text-sm text-slate-400 mt-3">
              {file ? `${formatBytes(file.size)}${stats ? ` · ${stats.originalWidth}×${stats.originalHeight}` : ""}` : ""}
            </p>
          </figure>
          <figure className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <figcaption className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Compressed</figcaption>
            {compressedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={compressedUrl} alt="Compressed preview" className="w-full rounded-xl max-h-80 object-contain bg-black/40" />
            ) : (
              <div className="h-48 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-slate-500 text-sm">
                Waiting for compression
              </div>
            )}
            <p className="text-sm text-slate-400 mt-3">
              {stats
                ? `${formatBytes(stats.compressedSize)} · ${stats.savedPercentage}% smaller · ${stats.outputWidth}×${stats.outputHeight} · ${stats.outputFormat} · ${stats.processingTimeMs} ms`
                : ""}
            </p>
          </figure>
        </div>
      )}
    </div>
  );
}
