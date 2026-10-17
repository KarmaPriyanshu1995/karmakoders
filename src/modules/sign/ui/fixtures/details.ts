import type { ActivityEventVM, DocumentDetailVM, DocumentRowVM, SignerVM } from "../view-models";
import { DOCUMENT_FIXTURES, manyDocuments } from "./documents";

/**
 * Document detail fixtures (signers with timestamps, audit activity, preview), derived from the
 * document row so every status has a consistent detail page.
 * TODO(Step 7): read SignDocument + signers; TODO(Step 9): activity from the Sign audit trail.
 */

const MINUTE = 60_000;

function shift(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * MINUTE).toISOString();
}

function roleFor(index: number): string {
  return index === 0 ? "Party A" : index === 1 ? "Party B" : `Signer ${index + 1}`;
}

export function signersFor(doc: DocumentRowVM): SignerVM[] {
  const sentAt = doc.status === "DRAFT" ? null : shift(doc.createdAt, 5);
  const sequential = doc.signingOrder === "sequential";
  return doc.signers.map((person, index) => {
    const base: SignerVM = {
      id: `${doc.id}_s${index + 1}`,
      name: person.name,
      email: person.email,
      role: roleFor(index),
      order: index + 1,
      status: "PENDING",
      sentAt: sequential && index > doc.signedCount ? null : sentAt,
      viewedAt: null,
      signedAt: null,
      declinedAt: null,
      declineReason: null,
    };
    const step = (n: number) => shift(doc.createdAt, 60 * (index + 1) + n);
    switch (doc.status) {
      case "COMPLETED":
        return { ...base, sentAt, status: "SIGNED", viewedAt: step(0), signedAt: step(10) };
      case "PARTIALLY_SIGNED":
      case "SENT":
        if (index < doc.signedCount) return { ...base, status: "SIGNED", viewedAt: step(0), signedAt: step(10) };
        if (index === doc.signedCount) return { ...base, status: "VIEWED", viewedAt: step(0) };
        return base;
      case "DECLINED":
        if (index === 0) return { ...base, status: "SIGNED", viewedAt: step(0), signedAt: step(10) };
        if (index === 1)
          return {
            ...base,
            sentAt,
            status: "DECLINED",
            viewedAt: step(0),
            declinedAt: step(15),
            declineReason: "The payment terms don't match what we agreed. Please send a corrected version.",
          };
        return base;
      default:
        return base;
    }
  });
}

export function activityFor(doc: DocumentRowVM, signers: SignerVM[]): ActivityEventVM[] {
  const events: ActivityEventVM[] = [{ id: `${doc.id}_created`, kind: "created", actor: "You", at: doc.createdAt }];
  if (doc.status !== "DRAFT") events.push({ id: `${doc.id}_sent`, kind: "sent", actor: "You", at: shift(doc.createdAt, 5) });
  for (const signer of signers) {
    if (signer.viewedAt) events.push({ id: `${signer.id}_viewed`, kind: "viewed", actor: signer.name, at: signer.viewedAt });
    if (signer.signedAt) events.push({ id: `${signer.id}_signed`, kind: "signed", actor: signer.name, at: signer.signedAt });
    if (signer.declinedAt)
      events.push({
        id: `${signer.id}_declined`,
        kind: "declined",
        actor: signer.name,
        at: signer.declinedAt,
        detail: signer.declineReason ?? undefined,
      });
  }
  if (doc.status === "PARTIALLY_SIGNED" || doc.status === "SENT") {
    events.push({ id: `${doc.id}_reminded`, kind: "reminded", actor: "You", at: shift(doc.createdAt, 24 * 60) });
  }
  if (doc.status === "COMPLETED" && doc.completedAt)
    events.push({ id: `${doc.id}_completed`, kind: "completed", actor: "KarmaKoders Sign", at: doc.completedAt });
  if (doc.status === "VOIDED") events.push({ id: `${doc.id}_voided`, kind: "voided", actor: "You", at: doc.lastActivity.at });
  if (doc.status === "EXPIRED" && doc.expiresAt)
    events.push({ id: `${doc.id}_expired`, kind: "expired", actor: "KarmaKoders Sign", at: doc.expiresAt });
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

const PREVIEW_FIELDS = [
  { label: "Party A legal name", value: "Acme Studio LLC" },
  { label: "Party B legal name", value: "Northwind Analytics Inc." },
  { label: "Effective date", value: "October 15, 2026" },
  { label: "Confidentiality term (months)", value: "24" },
  { label: "Purpose of disclosure", value: "Evaluating a joint product partnership and sharing roadmap details." },
];

export function documentDetailFor(doc: DocumentRowVM): DocumentDetailVM {
  const signers = signersFor(doc);
  return {
    document: {
      ...doc,
      message: doc.status === "DRAFT" ? null : "Hi both, please review and sign when you have a moment. Thanks!",
      remindersEnabled: true,
    },
    signers,
    activity: activityFor(doc, signers),
    preview: { fields: PREVIEW_FIELDS },
  };
}

/** Looks up a fixture document by id (the sample list plus the generated bulk rows). */
export function findDocumentDetail(id: string): DocumentDetailVM | null {
  const doc = [...DOCUMENT_FIXTURES, ...manyDocuments(25)].find((d) => d.id === id);
  return doc ? documentDetailFor(doc) : null;
}
