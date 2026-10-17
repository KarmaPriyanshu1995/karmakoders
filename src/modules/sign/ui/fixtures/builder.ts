import type { BuilderState, BuilderStep } from "../screens/builder/builder-state";
import type { BuilderTemplateVM } from "../view-models";
import { TEN_SIGNER_PEOPLE } from "./documents";

const SAMPLE_BY_TYPE: Record<string, string> = {
  text: "Acme Studio LLC",
  email: "legal@acmestudio.com",
  date: "2026-10-20",
  number: "24",
  textarea: "Evaluating a joint product partnership and sharing roadmap details.",
};

/** A filled-in builder (all fields, `signerCount` signers) on `step`, for previews and tests. */
export function filledBuilderState(template: BuilderTemplateVM, signerCount: number, step: BuilderStep): Partial<BuilderState> {
  const roles = template.signerRoles.map((r) => r.label);
  return {
    step,
    values: Object.fromEntries(template.fields.map((f) => [f.key, SAMPLE_BY_TYPE[f.type] ?? "Sample"])),
    signers: TEN_SIGNER_PEOPLE.slice(0, signerCount).map((p, i) => ({
      id: `signer-${i + 1}`,
      name: p.name,
      email: p.email,
      role: roles[i % roles.length] ?? "Signer",
    })),
    message: "Hi, please review and sign when you have a moment. Thanks!",
    nextSignerId: signerCount + 1,
  };
}

/** Two signers sharing one email (in different case), to show the uniqueness error. */
export function duplicateEmailBuilderState(template: BuilderTemplateVM): Partial<BuilderState> {
  const filled = filledBuilderState(template, 2, 1);
  const [a, b] = filled.signers!;
  return { ...filled, signers: [a, { ...b, email: a.email.toUpperCase() }] };
}
