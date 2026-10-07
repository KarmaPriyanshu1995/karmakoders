import { z } from "zod";
import { emailSchema } from "@/platform/auth/schemas";

/**
 * Hidden honeypot field. Real users never see it (off-screen, aria-hidden, tabIndex -1,
 * autocomplete off); bots that fill every input reveal themselves.
 */
export const EARLY_ACCESS_HONEYPOT_FIELD = "kk_website";

/** Trimmed optional text; empty → undefined. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));
}

export const earlyAccessSchema = z.object({
  email: emailSchema,
  company: optionalText(120),
  role: optionalText(80),
  /** Where the signup came from, e.g. "landing" or "template:mutual-nda". */
  source: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9:_-]*$/)
    .optional()
    .transform((value) => (value ? value : undefined)),
  [EARLY_ACCESS_HONEYPOT_FIELD]: z.string().optional(),
});

export type EarlyAccessInput = z.input<typeof earlyAccessSchema>;
export type EarlyAccessData = z.output<typeof earlyAccessSchema>;

/** Same message for new and duplicate emails (and for bots), so membership never leaks. */
export const EARLY_ACCESS_SUCCESS_MESSAGE =
  "Thanks! You're on the early-access list. We'll email you when KarmaKoders Sign opens.";
export const EARLY_ACCESS_INVALID_EMAIL_MESSAGE = "Enter a valid email address.";
export const EARLY_ACCESS_INVALID_MESSAGE = "Please check the form and try again.";
export const EARLY_ACCESS_RATE_LIMIT_MESSAGE = "Too many requests. Please try again later.";
export const EARLY_ACCESS_ERROR_MESSAGE = "Something went wrong. Please try again.";

export type EarlyAccessFormState =
  | { status: "idle"; message: "" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; field?: "email" };

export const EARLY_ACCESS_INITIAL_STATE: EarlyAccessFormState = { status: "idle", message: "" };
