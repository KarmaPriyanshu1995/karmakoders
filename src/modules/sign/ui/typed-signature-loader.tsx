"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./feedback";

/**
 * Code-split entry for the typed signature picker. The signature fonts load only when this
 * renders, never from a layout or the ui barrel.
 */
export const TypedSignatureLazy = dynamic(() => import("./typed-signature"), {
  loading: () => (
    <div className="grid gap-3 sm:grid-cols-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <span className="sr-only">Loading signature styles…</span>
    </div>
  ),
});

/** Code-split typed signature text (adopt preview, placed field). Same font chunk as above. */
export const TypedSignatureTextLazy = dynamic(() => import("./typed-signature").then((m) => m.TypedSignatureText), {
  loading: () => <span className="text-[#1C1B1A]">…</span>,
});
