import Link from "next/link";
import { ArrowRight, CircleCheck, Clock, FilePlus2, FileUp, PenLine, Pencil, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import { Card } from "../card";
import { ProgressMeter } from "../display";
import { Alert, EmptyState } from "../feedback";
import type { DashboardVM, TemplateCardVM } from "../view-models";
import { formatDate } from "./format";
import { DocumentStatus, PageHeader, SectionHeading, TextLink, documentHref } from "./parts";

const COUNT_CARDS: { key: keyof DashboardVM["counts"]; label: string; href: string; icon: LucideIcon }[] = [
  { key: "waiting", label: "Waiting for signatures", href: "/tools/sign/documents?status=waiting", icon: Clock },
  { key: "inProgress", label: "In progress", href: "/tools/sign/documents?status=in_progress", icon: PenLine },
  {
    key: "completedThisMonth",
    label: "Completed this month",
    href: "/tools/sign/documents?status=completed&period=month",
    icon: CircleCheck,
  },
  { key: "drafts", label: "Drafts", href: "/tools/sign/documents?status=draft", icon: Pencil },
];

const CARD_LINK =
  "group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]";

export function QuickStartCards({ templates, headingLevel = "h3" }: { templates: TemplateCardVM[]; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {templates.map((t) => (
        <li key={t.slug}>
          <Link href={`/tools/sign/new/${t.slug}`} className={CARD_LINK}>
            <Card interactive className="flex h-full flex-col gap-2 p-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">{t.categoryLabel}</span>
              <Heading className="text-lg font-semibold text-white">{t.name}</Heading>
              <p className="flex-1 text-sm text-[#A39F97]">{t.shortDescription}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFC300]">
                Use this template
                <ArrowRight aria-hidden className="size-4" />
              </span>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FreeUsage({ plan }: { plan: DashboardVM["plan"] }) {
  if (plan.kind !== "free") return null;
  const left = plan.freeLimit - plan.freeUsed;
  return (
    <Card className="space-y-4 p-5">
      <ProgressMeter
        label="Free documents this month"
        value={plan.freeUsed}
        max={plan.freeLimit}
        valueText={`${plan.freeUsed} of ${plan.freeLimit} free documents this month`}
      />
      {left > 0 ? (
        <p className="text-sm text-[#A39F97]">
          {left === 1 ? "1 free document left" : `${left} free documents left`}. Free documents allow up to {plan.freeMaxSigners}{" "}
          signers.
        </p>
      ) : (
        <Alert
          tone="warning"
          title="You've used all your free documents this month"
          action={
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/tools/sign/billing">Buy credits</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/tools/sign/billing#plans">Upgrade to Sign Pro</Link>
              </Button>
            </div>
          }
        >
          You can still prepare drafts. Credits and Sign Pro let you send more, with up to 10 signers.
        </Alert>
      )}
    </Card>
  );
}

export function DashboardScreen({ vm }: { vm: DashboardVM }) {
  const newDocument = (
    <Button asChild>
      <Link href="/tools/sign/new">
        <FilePlus2 aria-hidden />
        New document
      </Link>
    </Button>
  );

  if (vm.isFirstTime) {
    return (
      <div className="space-y-10">
        <PageHeader title="Dashboard" description="Create a document, add signers and send it in about a minute." />
        <FreeUsage plan={vm.plan} />
        <EmptyState
          icon={FilePlus2}
          title="Send your first document"
          description="Pick a template, fill in the details, add who needs to sign and send. Signers don't need an account."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {newDocument}
              <Button asChild variant="secondary">
                <Link href="/tools/sign/new/upload">
                  <FileUp aria-hidden />
                  Upload a PDF
                </Link>
              </Button>
            </div>
          }
        />
        <section aria-labelledby="quick-start-heading" className="space-y-4">
          <SectionHeading id="quick-start-heading">Start from a template</SectionHeading>
          <QuickStartCards templates={vm.quickStart} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Dashboard" />

      <section aria-label="Document counts">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {COUNT_CARDS.map(({ key, label, href, icon: Icon }) => (
            <li key={key}>
              <Link href={href} className={CARD_LINK}>
                <Card interactive className="flex h-full flex-col gap-3 p-4 sm:p-5">
                  <Icon aria-hidden className="size-5 text-[#FFC300]" />
                  <span className="block text-3xl font-black text-white">{vm.counts[key].toLocaleString("en-US")}</span>
                  <span className="block text-sm text-[#A39F97]">{label}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <FreeUsage plan={vm.plan} />

      <section aria-labelledby="recent-heading" className="space-y-4">
        <SectionHeading id="recent-heading" action={<TextLink href="/tools/sign/documents">View all documents</TextLink>}>
          Recent documents
        </SectionHeading>
        <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          {vm.recent.slice(0, 5).map((doc) => (
            <li key={doc.id}>
              <Link
                href={documentHref(doc.id)}
                className={cn(
                  "flex flex-col gap-2 p-4 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFC300] sm:flex-row sm:items-center sm:justify-between motion-reduce:transition-none"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-white">{doc.title}</span>
                  <span className="block text-sm text-[#A39F97]">
                    {doc.lastActivity.label} · {formatDate(doc.lastActivity.at)}
                  </span>
                </span>
                <DocumentStatus doc={doc} className="w-fit shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quick-start-heading" className="space-y-4">
        <SectionHeading id="quick-start-heading" action={<TextLink href="/tools/sign/new">All templates</TextLink>}>
          Quick start
        </SectionHeading>
        <QuickStartCards templates={vm.quickStart} />
      </section>
    </div>
  );
}
