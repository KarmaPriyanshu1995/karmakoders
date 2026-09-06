export const IMAGE_COMPRESSOR_API_BASE = (
  process.env.NEXT_PUBLIC_IMAGE_COMPRESSOR_API || "http://compressor.karmakoders.com"
).replace(/\/$/, "");

export const COMPRESS_ENDPOINT = `${IMAGE_COMPRESSOR_API_BASE}/api/v1/compress`;

export const MAX_COMPRESS_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export type CompressOutputFormat = "auto" | "jpg" | "png" | "webp";
export type CompressMode = "quality" | "balanced" | "maximum";

export interface CompressStats {
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercentage: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  originalFormat: string;
  outputFormat: string;
  processingTimeMs: number;
  filename: string;
  contentType: string;
}

export interface CompressSuccess {
  ok: true;
  blob: Blob;
  stats: CompressStats;
}

export interface CompressFailure {
  ok: false;
  status: number;
  message: string;
  retryAfterSeconds?: number;
}

function headerNumber(headers: Headers, name: string, fallback = 0) {
  const value = Number(headers.get(name) || fallback);
  return Number.isFinite(value) ? value : fallback;
}

function parseFilename(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (star?.[1]) return decodeURIComponent(star[1].replaceAll('"', ""));
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() || fallback;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isAcceptedImage(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function compressImageFile(input: {
  file: File;
  quality: number;
  outputFormat: CompressOutputFormat;
  resize: boolean;
  maxWidth: number;
  maxHeight: number;
  preserveMetadata: boolean;
  mode: CompressMode;
}): Promise<CompressSuccess | CompressFailure> {
  const body = new FormData();
  body.append("file", input.file);
  body.append("quality", String(input.quality));
  body.append("output_format", input.outputFormat);
  body.append("resize", input.resize ? "true" : "false");
  body.append("max_width", String(input.maxWidth));
  body.append("max_height", String(input.maxHeight));
  body.append("preserve_metadata", input.preserveMetadata ? "true" : "false");
  body.append("mode", input.mode);

  let response: Response;
  try {
    response = await fetch(COMPRESS_ENDPOINT, { method: "POST", body });
  } catch {
    return { ok: false, status: 0, message: "Could not reach the compression API. Is it running on port 8000?" };
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    let retryAfter = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    if (!Number.isFinite(retryAfter) || retryAfter <= 0) {
      const payload = (await response.json().catch(() => ({}))) as { retry_after_seconds?: number; message?: string };
      retryAfter = Number(payload.retry_after_seconds) || 60;
      return {
        ok: false,
        status: 429,
        message:
          payload.message ||
          "You can compress up to 3 images per minute. Please try again later.",
        retryAfterSeconds: retryAfter,
      };
    }
    return {
      ok: false,
      status: 429,
      message: "You can compress up to 3 images per minute. Please try again later.",
      retryAfterSeconds: retryAfter,
    };
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    return {
      ok: false,
      status: response.status,
      message: payload.message || "Compression failed. Use a JPG, PNG, or WebP under 10 MB.",
    };
  }

  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("Content-Disposition"), "compressed_image");

  return {
    ok: true,
    blob,
    stats: {
      originalSize: headerNumber(response.headers, "X-Original-Size", input.file.size),
      compressedSize: headerNumber(response.headers, "X-Compressed-Size", blob.size),
      savedBytes: headerNumber(response.headers, "X-Saved-Bytes"),
      savedPercentage: headerNumber(response.headers, "X-Saved-Percentage"),
      originalWidth: headerNumber(response.headers, "X-Original-Width"),
      originalHeight: headerNumber(response.headers, "X-Original-Height"),
      outputWidth: headerNumber(response.headers, "X-Output-Width"),
      outputHeight: headerNumber(response.headers, "X-Output-Height"),
      originalFormat: response.headers.get("X-Original-Format") || "unknown",
      outputFormat: response.headers.get("X-Output-Format") || "unknown",
      processingTimeMs: headerNumber(response.headers, "X-Processing-Time-Ms"),
      filename,
      contentType: response.headers.get("Content-Type") || blob.type,
    },
  };
}
