"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileSignature, Inbox, MoreHorizontal, Pencil, Plus, Send, Trash2 } from "lucide-react";
// Client code imports Sign UI modules by path: the "@/modules/sign/ui" barrel also exports
// server-only marketing components (pricing reads plans.ts).
import { Button, IconButton, type ButtonSize, type ButtonVariant } from "@/modules/sign/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/sign/ui/card";
import { Avatar, CreditBalanceChip, Kbd, ProgressMeter, Stepper } from "@/modules/sign/ui/display";
import { DocumentFrame } from "@/modules/sign/ui/document-frame";
import { Alert, EmptyState, ErrorState, Skeleton } from "@/modules/sign/ui/feedback";
import { DOCUMENT_STATUS, SIGNER_STATUS, type SignSignerStatusName } from "@/modules/sign/ui/status";
import { StatusBadge, ToneBadge } from "@/modules/sign/ui/status-badge";
import { CopyButton } from "@/modules/sign/ui/copy-button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/modules/sign/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/sign/ui/dropdown-menu";
import { Checkbox, FormField, Input, Radio, RadioGroup, Select, Switch, Textarea } from "@/modules/sign/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/sign/ui/tabs";
import { notify } from "@/modules/sign/ui/toast";
import { Tooltip } from "@/modules/sign/ui/tooltip";
import { FIXED_PAIRS, SITE_BACKGROUNDS, TONES, contrastRatio, toneContrast, type Tone } from "@/modules/sign/ui/colors";
import { TypedSignatureLazy } from "@/modules/sign/ui/typed-signature-loader";
import type { SignatureFontId } from "@/modules/sign/ui/typed-signature";
import type { SignDocumentStatusName } from "@/platform/db/sign-status";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "link", "danger"];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];
const TONE_NAMES = Object.keys(TONES) as Tone[];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4 border-t border-white/10 pt-10">
      <h2 id={id} className="text-2xl font-black tracking-tight text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function ratioCell(ratio: number, min: number) {
  return (
    <td className="px-3 py-2 tabular-nums">
      {ratio.toFixed(2)}:1{" "}
      <span className={ratio >= min ? "text-emerald-400" : "text-rose-400"}>{ratio >= min ? "✓ AA" : "✗ fails"}</span>
    </td>
  );
}

function ContrastTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Contrast ratios of Sign colours on the site backgrounds</caption>
        <thead className="bg-[#1C1B1A] text-xs uppercase tracking-widest text-[#A39F97]">
          <tr>
            <th scope="col" className="px-3 py-2">Pair</th>
            <th scope="col" className="px-3 py-2">On #252422</th>
            <th scope="col" className="px-3 py-2">On #1C1B1A</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {TONE_NAMES.map((tone) => (
            <tr key={tone}>
              <th scope="row" className="px-3 py-2 font-medium text-white">
                <ToneBadge tone={tone}>{tone}</ToneBadge> <code className="ml-2 text-xs text-[#A39F97]">{TONES[tone].text}</code>
              </th>
              {ratioCell(toneContrast(tone, SITE_BACKGROUNDS.main), 4.5)}
              {ratioCell(toneContrast(tone, SITE_BACKGROUNDS.secondary), 4.5)}
            </tr>
          ))}
          {FIXED_PAIRS.map((pair) => (
            <tr key={pair.name}>
              <th scope="row" className="px-3 py-2 font-medium text-white">
                {pair.name}
              </th>
              {ratioCell(contrastRatio(pair.fg, pair.bg), 4.5)}
              <td className="px-3 py-2 text-[#A39F97]">fixed pair</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UiPreview() {
  const [confirmLoading, setConfirmLoading] = React.useState(false);
  const [font, setFont] = React.useState<SignatureFontId>("dancing-script");
  const [signerName, setSignerName] = React.useState("Jordan Lee");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12 font-[family-name:var(--font-inter)] text-white sm:px-6 md:px-12">
      <header className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">Development only</p>
        <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Sign UI preview</h1>
        <p className="max-w-2xl leading-relaxed text-[#A39F97]">
          Every Sign component, variant and state on the site&apos;s dark theme. Rules live in docs/DESIGN.md. This page
          returns 404 unless NODE_ENV is development.
        </p>
        <p>
          <Link href="/tools/sign/dev/screens" className="font-semibold text-[#FFC300] underline-offset-4 hover:underline">
            Sender app screens in every state →
          </Link>
        </p>
      </header>

      <Section id="contrast" title="Colour and contrast">
        <div className="flex flex-wrap gap-3">
          {[
            ["#252422", "Main background"],
            ["#1C1B1A", "Secondary background"],
            ["#FFC300", "Accent"],
            ["#FFFFFF", "Text"],
            ["#A39F97", "Muted text"],
          ].map(([hex, name]) => (
            <div key={hex} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1C1B1A] p-3 pr-4">
              <span className="size-10 rounded-lg border border-white/15" style={{ backgroundColor: hex }} />
              <span className="text-sm">
                <span className="block font-semibold text-white">{name}</span>
                <code className="text-xs text-[#A39F97]">{hex}</code>
              </span>
            </div>
          ))}
        </div>
        <ContrastTable />
      </Section>

      <Section id="type" title="Typography">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">Eyebrow · accent</p>
        <p className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">Eyebrow · muted</p>
        <p className="text-4xl font-black tracking-tight text-white md:text-5xl">Page hero heading</p>
        <p className="text-3xl font-black tracking-tight text-white">Page heading (h1)</p>
        <p className="text-2xl font-black tracking-tight text-white">Section heading (h2)</p>
        <p className="text-lg font-semibold text-white">Card title (h3)</p>
        <p className="max-w-2xl leading-relaxed text-white">Body text in Inter. Plain English, sentence case.</p>
        <p className="max-w-2xl text-sm leading-relaxed text-[#A39F97]">Muted supporting text for hints and descriptions.</p>
        <a href="#type" className="text-sm text-[#FFC300] underline-offset-4 hover:underline">
          Inline link
        </a>
      </Section>

      <Section id="buttons" title="Buttons">
        {VARIANTS.map((variant) => (
          <Row key={variant} label={variant}>
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant === "danger" ? "Void document" : "Send for signature"} ({size})
              </Button>
            ))}
            <Button variant={variant} icon={<Send />}>
              With icon
            </Button>
            <Button variant={variant} loading loadingText="Sending…">
              Send
            </Button>
            <Button variant={variant} disabled>
              Disabled
            </Button>
          </Row>
        ))}
        <Row label="Icon buttons (aria-label required)">
          <IconButton aria-label="More actions">
            <MoreHorizontal />
          </IconButton>
          <IconButton aria-label="Edit document" variant="secondary">
            <Pencil />
          </IconButton>
          <IconButton aria-label="New document" variant="primary">
            <Plus />
          </IconButton>
          <IconButton aria-label="Delete draft" variant="danger">
            <Trash2 />
          </IconButton>
          <IconButton aria-label="Saving" loading>
            <Pencil />
          </IconButton>
        </Row>
        <Row label="Keyboard">
          <span className="text-sm text-[#A39F97]">
            Press <Kbd>Tab</Kbd> to move, <Kbd>Enter</Kbd> to activate, <Kbd>Esc</Kbd> to close.
          </span>
        </Row>
      </Section>

      <Section id="forms" title="Form controls">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField label="Signer name" hint="As it should appear on the document." required>
            <Input placeholder="Jordan Lee" />
          </FormField>
          <FormField label="Signer email" required error="Enter an email like name@company.com.">
            <Input type="email" defaultValue="jordan@" />
          </FormField>
          <FormField label="Message to signers" hint="Optional. Shown in the signing email.">
            <Textarea placeholder="Hi Jordan, please review and sign." />
          </FormField>
          <FormField label="Signing order">
            <Select defaultValue="parallel">
              <option value="parallel">Everyone at once</option>
              <option value="sequential">One after another</option>
            </Select>
          </FormField>
          <FormField label="Disabled field">
            <Input disabled defaultValue="Cannot edit after sending" />
          </FormField>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Checkbox label="I agree to sign electronically" description="Required before the signature pad opens." />
            <Checkbox label="Disabled checkbox" disabled />
          </div>
          <RadioGroup legend="Signature method">
            <Radio name="method" label="Draw" defaultChecked />
            <Radio name="method" label="Type" />
            <Radio name="method" label="Upload an image" />
          </RadioGroup>
          <div>
            <Switch label="Send reminders" defaultChecked />
            <Switch label="Expire after 30 days" />
          </div>
        </div>
      </Section>

      <Section id="status" title="Status vocabulary">
        <Row label="Documents">
          {(Object.keys(DOCUMENT_STATUS) as SignDocumentStatusName[]).map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
          <StatusBadge status="PARTIALLY_SIGNED" counts={{ signed: 1, total: 3 }} />
        </Row>
        <Row label="Signers">
          {(Object.keys(SIGNER_STATUS) as SignSignerStatusName[]).map((status) => (
            <StatusBadge key={status} kind="signer" status={status} />
          ))}
        </Row>
      </Section>

      <Section id="cards" title="Cards and alerts">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Static card</CardTitle>
              <CardDescription>No hover lift: it is not clickable.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#A39F97]">Use for summaries and settings panels.</CardContent>
          </Card>
          <Card interactive>
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>Site hover lift and glow, for clickable list items.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="SENT" />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-3">
          <Alert tone="info" title="Signers get an email with a secure link">They don&apos;t need an account.</Alert>
          <Alert tone="success" title="Document sent">We emailed 2 signers. You&apos;ll be notified as they sign.</Alert>
          <Alert tone="warning" title="Free plan: 1 send left this month">Buy credits to keep sending after that.</Alert>
          <Alert tone="danger" title="We couldn't send the document" action={<Button size="sm" variant="secondary">Try again</Button>}>
            The connection dropped before we got a reply. Nothing was charged. Try again.
          </Alert>
          <Alert tone="neutral" title="This document was voided">Signers can no longer open it.</Alert>
        </div>
      </Section>

      <Section id="overlays" title="Toasts, dialogs, menus and tooltips">
        <Row label="Toasts (root Sonner toaster)">
          <Button variant="secondary" onClick={() => notify.success("Document sent", { description: "We emailed 2 signers." })}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => notify.info("Reminder scheduled")}>
            Info toast
          </Button>
          <Button variant="secondary" onClick={() => notify.warning("Link expires tomorrow")}>
            Warning toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => notify.error("We couldn't save your draft", { description: "Check your connection and try again." })}
          >
            Error toast
          </Button>
        </Row>
        <Row label="Dialogs">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Add a signer</DialogTitle>
              <DialogDescription>They get an email with a secure signing link.</DialogDescription>
              <div className="mt-4 space-y-4">
                <FormField label="Name" required>
                  <Input />
                </FormField>
                <FormField label="Email" required>
                  <Input type="email" />
                </FormField>
              </div>
              <DialogFooter>
                <Button>Add signer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ConfirmDialog
            trigger={<Button variant="danger">Void document</Button>}
            title="Void this document?"
            consequences="Signers can no longer open or sign it, and everyone who received it is told it was voided. This can't be undone."
            confirmLabel="Void document"
            loading={confirmLoading}
            loadingText="Voiding…"
            onConfirm={() => {
              setConfirmLoading(true);
              setTimeout(() => setConfirmLoading(false), 1500);
            }}
          />
        </Row>
        <Row label="Menu and tooltip">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" icon={<MoreHorizontal />}>
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Mutual NDA</DropdownMenuLabel>
              <DropdownMenuItem>
                <Send aria-hidden /> Send reminder
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileSignature aria-hidden /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger">
                <Trash2 aria-hidden /> Void document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip content="Signers get this link by email">
            <IconButton aria-label="About signing links" variant="secondary">
              <Inbox />
            </IconButton>
          </Tooltip>
        </Row>
      </Section>

      <Section id="tabs" title="Tabs">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="waiting">Waiting</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="text-sm text-[#A39F97]">All documents.</TabsContent>
          <TabsContent value="waiting" className="text-sm text-[#A39F97]">Waiting for signatures.</TabsContent>
          <TabsContent value="completed" className="text-sm text-[#A39F97]">Completed documents.</TabsContent>
          <TabsContent value="drafts" className="text-sm text-[#A39F97]">Drafts.</TabsContent>
        </Tabs>
      </Section>

      <Section id="states" title="Loading, empty and error states">
        <div className="grid gap-3 md:grid-cols-3" aria-label="Loading documents">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={FileSignature}
            title="No documents yet"
            description="Documents you send for signature show up here."
            action={
              <Button icon={<Plus />} size="md">
                New document
              </Button>
            }
          />
          <ErrorState
            description="We couldn't load your documents. Check your connection and try again."
            action={
              <Button variant="secondary" size="md">
                Try again
              </Button>
            }
          />
        </div>
      </Section>

      <Section id="display" title="Progress, people and credits">
        <Stepper steps={["Choose template", "Fill in details", "Add signers", "Review and send"]} current={2} />
        <ProgressMeter label="Signatures" value={1} max={3} valueText="1 of 3 signed" className="max-w-md" />
        <Row label="Avatars, credits, copy">
          <Avatar name="Jordan Lee" />
          <Avatar name="acme@studio.com" />
          <Avatar name="Sam" size="sm" />
          <CreditBalanceChip credits={1} />
          <CreditBalanceChip credits={30} />
          <CopyButton value="https://www.karmakoders.com/tools/sign/verify/EXAMPLE" label="Copy verification link" />
        </Row>
      </Section>

      <Section id="document" title="Document preview (the one white surface)">
        <DocumentFrame
          label="Mutual NDA preview"
          toolbar={
            <>
              <StatusBadge status="DRAFT" />
              <Button variant="ghost" size="sm" icon={<ArrowRight />}>
                Continue
              </Button>
            </>
          }
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-black/60">Acme Studio LLC</p>
          <h3 className="mt-3 text-2xl font-bold">Mutual Non-Disclosure Agreement</h3>
          <p className="mt-4 text-sm leading-relaxed text-black/80">
            This agreement is made between Acme Studio LLC and Jordan Lee. Each party may share confidential information
            with the other and agrees to protect it as described below.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="border-t border-black/20 pt-2 text-xs text-black/60">Signature · Acme Studio LLC</div>
            <div className="border-t border-black/20 pt-2 text-xs text-black/60">Signature · Jordan Lee</div>
          </div>
        </DocumentFrame>
        <div className="max-w-2xl space-y-4">
          <FormField label="Type your name">
            <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          </FormField>
          <TypedSignatureLazy name={signerName} value={font} onChange={setFont} />
        </div>
      </Section>
    </main>
  );
}
