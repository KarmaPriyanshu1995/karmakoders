import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { NOINDEX_OPEN_GRAPH } from "@/modules/sign/seo";
import { findPreviewScreen, previewHref } from "../registry";

export const metadata: Metadata = {
  title: "Sign screen preview | KarmaKoders Sign",
  robots: { index: false, follow: false, nocache: true },
  openGraph: NOINDEX_OPEN_GRAPH,
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ screen: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * One sender or signer screen in one fixture state (?state=), with a switcher for the others. One state
 * per page keeps it fast and avoids duplicate element ids. 404 unless NODE_ENV is "development".
 */
export default async function SignScreenPreviewPage({ params, searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const screen = findPreviewScreen((await params).screen);
  if (!screen) notFound();
  const requested = (await searchParams).state;
  const state = screen.states.find((s) => s.id === requested) ?? screen.states[0];

  return (
    <div className="min-h-screen bg-[#252422] font-[family-name:var(--font-inter)] text-white">
      <div className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6 md:px-12">
          <p className="text-sm text-[#A39F97]">
            <Link href="/tools/sign/dev/screens" className="font-semibold text-[#FFC300] underline-offset-4 hover:underline">
              Screens
            </Link>{" "}
            / {screen.title} <code className="ml-2 text-xs">{screen.route}</code>
          </p>
          <nav aria-label="Fixture states" className="flex flex-wrap gap-2">
            {screen.states.map((s) => (
              <Link
                key={s.id}
                href={previewHref(screen.id, s.id)}
                aria-current={s.id === state.id ? "page" : undefined}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                  s.id === state.id ? "border-[#FFC300] bg-[#FFC300] text-[#1C1B1A]" : "border-white/15 text-white hover:bg-white/10"
                )}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {screen.group === "signer" ? (
        // Signer screens bring their own SignerShell and run full width, as on the real route.
        <div data-preview-state={state.id}>{state.render()}</div>
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:px-12" data-preview-state={state.id}>
          {state.render()}
        </div>
      )}
    </div>
  );
}
