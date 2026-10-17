"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateCategory } from "@/modules/sign/templates/catalog";
import { Card } from "../card";
import type { TemplatePickerVM } from "../view-models";
import { PageHeader } from "./parts";

const CARD_LINK =
  "group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422]";

const FILTER_BUTTON =
  "inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] motion-reduce:transition-none";

/** Pick a catalog template (filtered by category) or upload your own PDF. */
export function TemplatePickerScreen({ vm }: { vm: TemplatePickerVM }) {
  const [category, setCategory] = React.useState<TemplateCategory | "all">("all");
  const templates = category === "all" ? vm.templates : vm.templates.filter((t) => t.category === category);
  const filters: { id: TemplateCategory | "all"; label: string }[] = [{ id: "all", label: "All" }, ...vm.categories];

  return (
    <div className="space-y-8">
      <PageHeader title="New document" description="Start from a template or upload a PDF you already have." />

      <div role="group" aria-label="Filter templates by category" className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex min-w-max gap-1 rounded-xl border border-white/10 bg-[#1C1B1A] p-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={category === f.id}
              onClick={() => setCategory(f.id)}
              className={cn(FILTER_BUTTON, category === f.id ? "bg-[#FFC300] text-[#1C1B1A]" : "text-white hover:bg-white/10")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p role="status" className="sr-only">
        {templates.length === 1 ? "1 template" : `${templates.length} templates`} shown
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <li key={t.slug}>
            <Link href={`/tools/sign/new/${t.slug}`} className={CARD_LINK}>
              <Card interactive className="flex h-full flex-col gap-2 p-5">
                <span className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">{t.categoryLabel}</span>
                <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                <p className="flex-1 text-sm text-[#A39F97]">{t.shortDescription}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFC300]">
                  Use this template
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </Card>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/tools/sign/new/upload" className={CARD_LINK}>
            <Card interactive className="flex h-full flex-col gap-2 border-dashed p-5">
              <FileUp aria-hidden className="size-6 text-[#FFC300]" />
              <h2 className="text-lg font-semibold text-white">Upload your own PDF</h2>
              <p className="flex-1 text-sm text-[#A39F97]">Already have the document? Upload it and place signature fields.</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFC300]">
                Upload a PDF
                <ArrowRight aria-hidden className="size-4" />
              </span>
            </Card>
          </Link>
        </li>
      </ul>
    </div>
  );
}
