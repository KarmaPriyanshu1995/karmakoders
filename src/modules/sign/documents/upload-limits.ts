/**
 * Upload-your-own-PDF limits. Client-safe: the upload screen checks them before anything is sent,
 * and the upload API (later step) must enforce the same values on the server.
 */
export const UPLOAD_PDF_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_PDF_MIME = "application/pdf";

/** Logo for branding and templates (PRD S2). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/png", "image/svg+xml"] as const;

/** "10 MB", "2 MB", "1.5 MB". */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
