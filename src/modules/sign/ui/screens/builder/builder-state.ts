import type { TemplateField, TemplateSignerRole } from "@/modules/sign/templates/catalog";
import type { SigningOrder } from "../../view-models";

/**
 * Builder state: a pure reducer plus validation, so the rules are unit-tested without a browser.
 * The server repeats every check with zod at send (Step 9); this is for fast, friendly feedback
 * and deliberately avoids zod so the client bundle stays small.
 */

/** Same shape the server accepts: something@domain.tld, no spaces, at most 254 characters. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

export const BUILDER_STEPS = ["Details", "Signers", "Review & send"] as const;
export type BuilderStep = 0 | 1 | 2;

export type SignerDraft = { id: string; name: string; email: string; role: string };

export type BuilderState = {
  step: BuilderStep;
  values: Record<string, string>;
  signers: SignerDraft[];
  mode: SigningOrder;
  message: string;
  expiryDays: number;
  reminders: boolean;
  confirmEligible: boolean;
  nextSignerId: number;
};

export type BuilderAction =
  | { type: "set_step"; step: BuilderStep }
  | { type: "set_value"; key: string; value: string }
  | { type: "add_signer"; role: string }
  | { type: "remove_signer"; id: string }
  | { type: "update_signer"; id: string; patch: Partial<Omit<SignerDraft, "id">> }
  | { type: "move_signer"; id: string; direction: "up" | "down" }
  | { type: "reorder_signers"; fromId: string; toId: string }
  | { type: "set_mode"; mode: SigningOrder }
  | { type: "set_message"; message: string }
  | { type: "set_expiry"; days: number }
  | { type: "set_reminders"; on: boolean }
  | { type: "set_confirm"; on: boolean };

export const MESSAGE_MAX = 1000;
export const EXPIRY_OPTIONS = [3, 7, 14, 30, 60] as const;

export function initialBuilderState(
  template: { fields: TemplateField[]; signerRoles: TemplateSignerRole[] },
  options: { defaultExpiryDays: number; maxSigners: number; step?: BuilderStep }
): BuilderState {
  const roles = template.signerRoles.slice(0, Math.max(options.maxSigners, 1));
  return {
    step: options.step ?? 0,
    values: Object.fromEntries(template.fields.map((f) => [f.key, ""])),
    signers: roles.map((role, index) => ({ id: `signer-${index + 1}`, name: "", email: "", role: role.label })),
    mode: "sequential",
    message: "",
    expiryDays: options.defaultExpiryDays,
    reminders: true,
    confirmEligible: false,
    nextSignerId: roles.length + 1,
  };
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "set_step":
      return { ...state, step: action.step };
    case "set_value":
      return { ...state, values: { ...state.values, [action.key]: action.value } };
    case "add_signer":
      return {
        ...state,
        signers: [...state.signers, { id: `signer-${state.nextSignerId}`, name: "", email: "", role: action.role }],
        nextSignerId: state.nextSignerId + 1,
      };
    case "remove_signer":
      return state.signers.length <= 1 ? state : { ...state, signers: state.signers.filter((s) => s.id !== action.id) };
    case "update_signer":
      return { ...state, signers: state.signers.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };
    case "move_signer": {
      const from = state.signers.findIndex((s) => s.id === action.id);
      const to = action.direction === "up" ? from - 1 : from + 1;
      const moved = move(state.signers, from, to);
      return moved === state.signers ? state : { ...state, signers: moved };
    }
    case "reorder_signers": {
      const from = state.signers.findIndex((s) => s.id === action.fromId);
      const to = state.signers.findIndex((s) => s.id === action.toId);
      const moved = move(state.signers, from, to);
      return moved === state.signers ? state : { ...state, signers: moved };
    }
    case "set_mode":
      return { ...state, mode: action.mode };
    case "set_message":
      return { ...state, message: action.message.slice(0, MESSAGE_MAX) };
    case "set_expiry":
      return { ...state, expiryDays: action.days };
    case "set_reminders":
      return { ...state, reminders: action.on };
    case "set_confirm":
      return { ...state, confirmEligible: action.on };
  }
}

export type FieldErrors = Record<string, string>;

/** Required template fields, and email fields must be valid addresses. */
export function validateDetails(fields: TemplateField[], values: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const value = (values[field.key] ?? "").trim();
    if (!value) {
      if (field.required) errors[field.key] = `Enter the ${field.label.toLowerCase()}.`;
      continue;
    }
    if (field.type === "email" && !normalizeEmail(value)) {
      errors[field.key] = "Enter a valid email address, like name@example.com.";
    }
    if (field.type === "number" && !/^\d+$/.test(value)) {
      errors[field.key] = "Enter a whole number, like 12.";
    }
  }
  return errors;
}

export type SignerValidation = {
  errors: Record<string, { name?: string; email?: string }>;
  /** Set when there are more signers than the plan allows. */
  limitError: string | null;
  valid: boolean;
};

/** Name and a valid, unique (case-insensitive) email per signer; at most `maxSigners` signers. */
export function validateSigners(signers: SignerDraft[], maxSigners: number): SignerValidation {
  const errors: SignerValidation["errors"] = {};
  const seen = new Map<string, string>();
  for (const signer of signers) {
    const entry: { name?: string; email?: string } = {};
    if (!signer.name.trim()) entry.name = "Enter the signer's name.";
    const email = normalizeEmail(signer.email);
    if (!signer.email.trim()) {
      entry.email = "Enter the signer's email address.";
    } else if (!email) {
      entry.email = "Enter a valid email address, like name@example.com.";
    } else if (seen.has(email)) {
      entry.email = "Another signer already uses this email. Each signer needs their own email address.";
    } else {
      seen.set(email, signer.id);
    }
    if (entry.name || entry.email) errors[signer.id] = entry;
  }
  const limitError =
    signers.length > maxSigners
      ? `Your plan allows up to ${maxSigners} ${maxSigners === 1 ? "signer" : "signers"} per document. Remove ${
          signers.length - maxSigners
        } or upgrade.`
      : null;
  return { errors, limitError, valid: Object.keys(errors).length === 0 && !limitError };
}
