import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../status-badge";
import type { DocumentRowVM } from "../view-models";

/** Shared, server-safe pieces of the sender screens. */

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">{eyebrow}</p> : null}
        <h1 className="break-words text-3xl font-black tracking-tight text-white">{title}</h1>
        {description ? <p className="max-w-2xl leading-relaxed text-[#A39F97]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({ id, children, action }: { id: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-2xl font-black tracking-tight text-white">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Status badge for a document row, with "x of y signed" when partly signed. */
export function DocumentStatus({ doc, className }: { doc: Pick<DocumentRowVM, "status" | "signedCount" | "signerCount">; className?: string }) {
  return <StatusBadge status={doc.status} counts={{ signed: doc.signedCount, total: doc.signerCount }} className={className} />;
}

export const TEXT_LINK =
  "rounded font-semibold text-[#FFC300] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]";

export function TextLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(TEXT_LINK, className)}>
      {children}
    </Link>
  );
}

export function documentHref(id: string): string {
  return `/tools/sign/documents/${encodeURIComponent(id)}`;
}
