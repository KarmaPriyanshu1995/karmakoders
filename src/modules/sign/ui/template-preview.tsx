import type { SignTemplateMeta } from "@/modules/sign/templates";

type PreviewProps = Pick<SignTemplateMeta, "name" | "fields" | "signerRoles">;

const SAMPLE_BY_TYPE: Record<string, string> = {
  text: "Sample value",
  email: "name@example.com",
  date: "January 15, 2027",
  number: "12",
  textarea: "Sample description entered when composing the document.",
};

const SAMPLE_NAMES = ["Acme Studio LLC", "Jordan Lee"];

/** Sample value for a field; name fields get realistic party names in order. */
export function sampleValueFor(field: { key: string; type: string }, nameIndex: number): string {
  if (field.key.endsWith("_name")) return SAMPLE_NAMES[nameIndex] ?? SAMPLE_NAMES[SAMPLE_NAMES.length - 1];
  return SAMPLE_BY_TYPE[field.type] ?? "—";
}

/**
 * Static, server-rendered sample preview (spec 3B: no client JS here). Shows how the document
 * is laid out with sample data; nothing is stored or sent.
 */
export function TemplatePreview({ name, fields, signerRoles }: PreviewProps) {
  const nameKeys = fields.filter((f) => f.key.endsWith("_name")).map((f) => f.key);
  const rows = fields.map((field) => ({ field, value: sampleValueFor(field, nameKeys.indexOf(field.key)) }));

  return (
    <article aria-label={`${name} sample preview`} className="rounded-xl bg-white p-6 text-[#1C1B1A] shadow-xl sm:p-8">
      <header className="border-b border-black/10 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-black/60">Your logo here</p>
        <p className="mt-3 text-xl font-bold">{name}</p>
        <p className="mt-1 text-xs text-black/60">Sample preview with example data</p>
      </header>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(({ field, value }) => (
          <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
            <dt className="text-xs uppercase tracking-wide text-black/60">{field.label}</dt>
            <dd className="mt-0.5 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Signature blocks" className="mt-8 grid gap-6 sm:grid-cols-2">
        {signerRoles.map((role) => (
          <div key={role.key}>
            <div className="h-10 border-b border-black/40" />
            <p className="mt-1 text-xs font-semibold">{role.label}</p>
            <p className="text-xs text-black/60">Signature · Date</p>
          </div>
        ))}
      </section>
    </article>
  );
}
