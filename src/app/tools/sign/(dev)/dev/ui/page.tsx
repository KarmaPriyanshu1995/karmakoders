import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NOINDEX_OPEN_GRAPH } from "@/modules/sign/seo";
import { UiPreview } from "./ui-preview";

export const metadata: Metadata = {
  title: "Sign UI preview | KarmaKoders Sign",
  robots: { index: false, follow: false, nocache: true },
  openGraph: NOINDEX_OPEN_GRAPH,
};

/** Rendered per request so the NODE_ENV check runs at request time, never baked into a build. */
export const dynamic = "force-dynamic";

/** Dev-only design-system preview (docs/DESIGN.md). 404 unless NODE_ENV is "development". */
export default function SignUiPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <UiPreview />;
}
