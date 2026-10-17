import { UPLOAD_PDF_MIME, formatBytes } from "@/modules/sign/documents/upload-limits";

/** Field placement on an uploaded PDF. Pure helpers, unit-tested. */

export const FIELD_TYPES = ["signature", "initials", "date", "text", "checkbox"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_LABELS: Record<FieldType, string> = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
  checkbox: "Checkbox",
};

/** Field box size as a percentage of the page width / height. */
export const FIELD_SIZE: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 32, h: 6 },
  initials: { w: 12, h: 5 },
  date: { w: 20, h: 4 },
  text: { w: 28, h: 4 },
  checkbox: { w: 8, h: 4 },
};

export type PlacedField = {
  id: string;
  type: FieldType;
  signerId: string;
  /** 1-based page number. */
  page: number;
  /** Top-left corner as a percentage of the page. */
  x: number;
  y: number;
};

export type UploadedFile = { name: string; size: number; pages: number };

/** What went wrong with a chosen file, or null when it can be used. */
export function validatePdfFile(file: { name: string; type: string; size: number }, maxBytes: number): string | null {
  const isPdf = file.type === UPLOAD_PDF_MIME || (file.type === "" && /\.pdf$/i.test(file.name));
  if (!isPdf) return "Only PDF files can be uploaded. Save your document as a PDF and try again.";
  if (file.size === 0) return "This file is empty. Choose a different PDF.";
  if (file.size > maxBytes) {
    return `This PDF is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}. Compress it or split it and try again.`;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Keeps a field fully on the page; positions are rounded to one decimal. */
export function clampPosition(type: FieldType, x: number, y: number): { x: number; y: number } {
  const size = FIELD_SIZE[type];
  return {
    x: Math.round(clamp(x, 0, 100 - size.w) * 10) / 10,
    y: Math.round(clamp(y, 0, 100 - size.h) * 10) / 10,
  };
}

/**
 * Where a keyboard-placed field goes: stacked down the left margin under the fields already on
 * that page, so repeated placements never overlap exactly.
 */
export function nextDefaultPosition(fields: PlacedField[], page: number, type: FieldType): { x: number; y: number } {
  const onPage = fields.filter((f) => f.page === page).length;
  return clampPosition(type, 8, 60 + onPage * 7);
}

/** Signers who have no signature field yet (each signer must sign somewhere). */
export function signersMissingSignature<T extends { id: string }>(signers: T[], fields: PlacedField[]): T[] {
  return signers.filter((s) => !fields.some((f) => f.signerId === s.id && f.type === "signature"));
}
