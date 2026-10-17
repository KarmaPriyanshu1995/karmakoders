import { z } from "zod";
import { DOCUMENT_FILTERS } from "../view-models";

/** Documents list query string. Untrusted: anything invalid falls back to the default. */
export const documentsSearchSchema = z.object({
  status: z.enum(DOCUMENT_FILTERS).catch("all"),
  period: z.literal("month").nullable().catch(null),
  q: z.string().trim().max(200).catch(""),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .nullable()
    .catch(null),
});

export type DocumentsSearch = z.infer<typeof documentsSearchSchema>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseDocumentsSearch(raw: Record<string, string | string[] | undefined>): DocumentsSearch {
  return documentsSearchSchema.parse({
    status: first(raw.status) ?? "all",
    period: first(raw.period) ?? null,
    q: first(raw.q) ?? "",
    cursor: first(raw.cursor) ?? null,
  });
}
