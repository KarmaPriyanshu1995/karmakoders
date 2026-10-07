import { z } from "zod";
import { emailSchema } from "@/platform/auth/schemas";
import { EARLY_ACCESS_HONEYPOT_FIELD } from "./constants";

export * from "./constants";

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
