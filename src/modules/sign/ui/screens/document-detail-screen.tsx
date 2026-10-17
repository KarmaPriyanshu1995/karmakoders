import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Avatar } from "../display";
import { CopyButton } from "../copy-button";
import { DocumentFrame } from "../document-frame";
import { Alert } from "../feedback";
import { StatusBadge } from "../status-badge";
import type { DocumentDetailVM, SignerVM } from "../view-models";
import { DocumentActionBar, RemindSignerButton } from "./document-actions";
import { canRemindSigner, documentActions } from "./document-policy";
import { activityLabel, formatDate, formatDateTime } from "./format";
import { DocumentStatus, PageHeader, SectionHeading, TEXT_LINK } from "./parts";

/** Public verification page for a completed document. TODO(Step 11): the verify page itself. */
export function verifyHref(publicId: string): string {
  return `/tools/sign/verify/${encodeURIComponent(publicId)}`;
}

function StatusNotice({ vm }: { vm: DocumentDetailVM }) {
  const { document: doc, signers } = vm;
  switch (doc.status) {
    case "DRAFT":
      return (
        <Alert tone="neutral" title="This document hasn't been sent">
          Nobody has received it yet. Drafts don&apos;t use credits or free documents.
        </Alert>
      );
    case "DECLINED": {
      const decliner = signers.find((s) => s.status === "DECLINED");
      return (
        <Alert tone="danger" title={decliner ? `${decliner.name} declined to sign` : "A signer declined to sign"}>
          {decliner?.declineReason ? <p className="break-words">Reason: &ldquo;{decliner.declineReason}&rdquo;</p> : null}
          <p>Nobody else can sign this document. Duplicate it to send a corrected version.</p>
        </Alert>
      );
    }
    case "EXPIRED":
      return (
        <Alert tone="neutral" title="The signing link expired">
          Not everyone signed before {doc.expiresAt ? formatDate(doc.expiresAt) : "the deadline"}. Duplicate it to send it again.
        </Alert>
      );
    case "VOIDED":
      return (
        <Alert tone="neutral" title="This document was voided">
          Signing links no longer work. The audit trail below is kept.
        </Alert>
      );
    default:
      return null;
  }
}

function SignerTimes({ signer, documentStatus }: { signer: SignerVM; documentStatus: DocumentDetailVM["document"]["status"] }) {
  const rows: [string, string][] = [];
  if (signer.sentAt) rows.push(["Sent", formatDateTime(signer.sentAt)]);
  if (signer.viewedAt) rows.push(["Opened", formatDateTime(signer.viewedAt)]);
  if (signer.signedAt) rows.push(["Signed", formatDateTime(signer.signedAt)]);
  if (signer.declinedAt) rows.push(["Declined", formatDateTime(signer.declinedAt)]);
  if (!signer.sentAt) {
    return (
      <p className="text-sm text-[#A39F97]">
        {documentStatus === "DRAFT" ? "Not sent yet" : "Waiting for their turn to sign"}
      </p>
    );
  }
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="text-[#A39F97]">{label}</dt>
          <dd className="text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DocumentDetailScreen({ vm }: { vm: DocumentDetailVM }) {
  const { document: doc, signers, activity, preview } = vm;
  const actions = documentActions(doc.status);
  const sequential = doc.signingOrder === "sequential";
  const active = doc.status === "SENT" || doc.status === "PARTIALLY_SIGNED";

  return (
    <div className="space-y-10">
      <Link href="/tools/sign/documents" className={`${TEXT_LINK} inline-flex min-h-11 items-center gap-1 text-sm`}>
        <ArrowLeft aria-hidden className="size-4" />
        All documents
      </Link>

      <div className="space-y-4">
        <PageHeader eyebrow={doc.templateName} title={doc.title} />
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#A39F97]">
          <DocumentStatus doc={doc} />
          {active && doc.expiresAt ? <span>Signing link expires {formatDate(doc.expiresAt)}</span> : null}
          {doc.completedAt ? <span>Completed {formatDate(doc.completedAt)}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#A39F97]">
            Document ID <code className="break-all rounded-md bg-white/5 px-2 py-1 font-mono text-white">{doc.publicId}</code>
          </span>
          <CopyButton value={doc.publicId} label="Copy ID" />
          {actions.canVerify ? (
            <Link href={verifyHref(doc.publicId)} className={`${TEXT_LINK} inline-flex min-h-11 items-center gap-1 text-sm`}>
              <ShieldCheck aria-hidden className="size-4" />
              Verify
            </Link>
          ) : null}
        </div>
        <DocumentActionBar status={doc.status} />
      </div>

      <StatusNotice vm={vm} />

      <section aria-labelledby="signers-heading" className="space-y-4">
        <SectionHeading id="signers-heading">Signers</SectionHeading>
        <p className="text-sm text-[#A39F97]">
          {sequential ? "Sequential: each signer gets the link after the one before signs." : "Parallel: everyone can sign at the same time."}
        </p>
        <ol className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          {signers.map((signer) => (
            <li key={signer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                {sequential ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/35 text-sm font-bold text-white">
                    <span className="sr-only">Signer </span>
                    {signer.order}
                  </span>
                ) : (
                  <Avatar name={signer.name} />
                )}
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="break-words font-semibold text-white">{signer.name}</p>
                    <p className="break-all text-sm text-[#A39F97]">{signer.email}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">{signer.role}</p>
                  </div>
                  <StatusBadge kind="signer" status={signer.status} />
                  <SignerTimes signer={signer} documentStatus={doc.status} />
                  {signer.declineReason ? (
                    <p className="break-words text-sm text-[#A39F97]">Reason: &ldquo;{signer.declineReason}&rdquo;</p>
                  ) : null}
                </div>
              </div>
              {canRemindSigner(doc.status, signer) ? <RemindSignerButton name={signer.name} /> : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-4">
        <SectionHeading id="activity-heading">Activity</SectionHeading>
        <ol className="space-y-4 border-l border-white/15 pl-6">
          {activity.map((event) => (
            <li key={event.id} className="relative">
              <span aria-hidden className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-[#FFC300] text-[#1C1B1A]" />
              <p className="break-words text-white">{activityLabel(event)}</p>
              {event.detail ? <p className="break-words text-sm text-[#A39F97]">&ldquo;{event.detail}&rdquo;</p> : null}
              <time dateTime={event.at} className="text-sm text-[#A39F97]">
                {formatDateTime(event.at)}
              </time>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="preview-heading" className="space-y-4">
        <SectionHeading id="preview-heading">Document</SectionHeading>
        <DocumentFrame label={`${doc.title} preview`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-black/60">{doc.templateName}</p>
          <p className="mt-2 break-words text-xl font-bold">{doc.title}</p>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {preview.fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs uppercase tracking-wide text-black/60">{field.label}</dt>
                <dd className="mt-0.5 break-words font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {signers.map((signer) => (
              <div key={signer.id}>
                <div className="flex h-10 items-end border-b border-black/40 pb-1 text-sm italic text-black/70">
                  {signer.signedAt ? signer.name : ""}
                </div>
                <p className="mt-1 text-xs font-semibold">{signer.role}</p>
                <p className="break-words text-xs text-black/60">{signer.name}</p>
              </div>
            ))}
          </div>
        </DocumentFrame>
      </section>
    </div>
  );
}
