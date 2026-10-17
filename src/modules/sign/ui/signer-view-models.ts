/**
 * View models for the signer screens (src/modules/sign/ui/screens/signer). Types only, so
 * client-safe. Screens take one of these and never call the database or an API; the actions
 * they need (send a code, consent, sign, decline) are passed in as functions by the page.
 */

/** Sender branding frozen on the document at send (SignDocument.brandingSnapshot). */
export type SignerBrandVM = {
  companyName: string | null;
  /** TODO(Step 10): logos live in private R2 and need a signed, signer-scoped URL. */
  logoUrl: null;
};

/** What every signer screen may show about the document. Never the link token. */
export type SignerContextVM = {
  documentTitle: string;
  /** Company name, else the sender's name; null when neither is known. */
  senderName: string | null;
  brand: SignerBrandVM;
  /** The signer's own name as the sender entered it (typed-signature default). */
  signerName: string;
  /** Always masked, e.g. "j***@example.com". */
  maskedEmail: string;
  /** Optional note from the sender, shown above the document. */
  message: string | null;
};

export type SignerFieldType = "signature" | "initials" | "date" | "text" | "checkbox";

/** A field on a page. Position and size are percentages of the page, so it scales with it. */
export type SignerFieldVM = {
  id: string;
  type: SignerFieldType;
  /** 1-based page number. */
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** True for the current signer's fields; other signers' fields are shown muted. */
  mine: boolean;
  required: boolean;
  /** Accessible name and visible caption, e.g. "Signature", "Job title". */
  label: string;
};

export type SignerPageBlock = { kind: "heading" | "paragraph"; text: string };

export type SignerPageVM = { number: number; blocks: SignerPageBlock[] };

export type ReviewVM = {
  context: SignerContextVM;
  /** Empty when the document content isn't available: the screen shows a safe state. */
  pages: SignerPageVM[];
  fields: SignerFieldVM[];
};

/** The signer's adopted signature, kept in the browser until Step 9 submits it. */
export type AdoptedSignature =
  | { method: "draw"; dataUrl: string }
  | { method: "type"; name: string; font: string }
  | { method: "upload"; dataUrl: string; fileName: string };

/** Value of one field the signer has completed. */
export type FieldValue =
  | { kind: "signature"; signature: AdoptedSignature }
  | { kind: "text"; text: string }
  | { kind: "checkbox"; checked: boolean };

export type SignerStateKind = "invalid" | "not-yet" | "expired" | "voided" | "already-signed" | "network";

/** Result of an action passed to a screen. `message` is safe to show; it never holds a code or token. */
export type SignerActionResult = { ok: true } | { ok: false; kind: "expired" | "error" | "network"; message: string };
