"use client";

import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONES, type Tone } from "./colors";
import { PANEL_CLASSES } from "./card";

/**
 * Sign toasts go through the root layout's Sonner <Toaster> (no second toaster). That toaster has
 * richColors, which paints light coloured toasts for typed calls (toast.success etc.), so Sign
 * always calls plain toast() with `unstyled` and the site's dark panel classes.
 */

type ToastTone = Exclude<Tone, "neutral">;

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: OctagonAlert } as const;

export type NotifyOptions = { description?: string; duration?: number };

export function toastOptions(tone: ToastTone, options: NotifyOptions = {}) {
  const Icon = ICONS[tone];
  return {
    unstyled: true,
    description: options.description,
    // Errors stay longer: they say what to do next.
    duration: options.duration ?? (tone === "danger" ? 8000 : 4000),
    icon: <Icon aria-hidden className={cn("size-4", TONES[tone].text)} />,
    classNames: {
      toast: cn(PANEL_CLASSES, "flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl p-4 text-sm text-white"),
      icon: "mt-0.5 shrink-0",
      title: "font-semibold text-white",
      description: "mt-1 text-[#A39F97]",
    },
  };
}

export const notify = {
  success: (title: string, options?: NotifyOptions) => toast(title, toastOptions("success", options)),
  info: (title: string, options?: NotifyOptions) => toast(title, toastOptions("info", options)),
  warning: (title: string, options?: NotifyOptions) => toast(title, toastOptions("warning", options)),
  error: (title: string, options?: NotifyOptions) => toast(title, toastOptions("danger", options)),
};
