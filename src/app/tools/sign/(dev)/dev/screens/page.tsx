import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NOINDEX_OPEN_GRAPH } from "@/modules/sign/seo";
import { PREVIEW_SCREENS, previewHref } from "./registry";

export const metadata: Metadata = {
  title: "Sign screens preview | KarmaKoders Sign",
  robots: { index: false, follow: false, nocache: true },
  openGraph: NOINDEX_OPEN_GRAPH,
};

/** Rendered per request so the NODE_ENV check runs at request time, never baked into a build. */
export const dynamic = "force-dynamic";

const GROUPS = [
  { id: "sender", title: "Sender screens" },
  { id: "signer", title: "Signer screens" },
] as const;

const LINK =
  "rounded font-semibold text-[#FFC300] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300]";

/** Dev-only index of every sender and signer screen and fixture state. 404 unless NODE_ENV is "development". */
export default function SignScreensPreviewIndex() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 px-4 py-12 font-[family-name:var(--font-inter)] text-white sm:px-6 md:px-12">
      <header className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">Development only</p>
        <h1 className="text-4xl font-black tracking-tight text-white">Sign screens</h1>
        <p className="max-w-2xl leading-relaxed text-[#A39F97]">
          Each screen with fixture data, one state at a time. Components: <Link href="/tools/sign/dev/ui" className={LINK}>Sign UI preview</Link>.
        </p>
      </header>
      {GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`} className="space-y-4">
          <h2 id={`group-${group.id}`} className="text-2xl font-black tracking-tight text-white">
            {group.title}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {PREVIEW_SCREENS.filter((screen) => screen.group === group.id).map((screen) => (
              <li key={screen.id} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold text-white">
                  <Link href={previewHref(screen.id)} className={LINK}>
                    {screen.title}
                  </Link>
                </h3>
                <p className="text-sm text-[#A39F97]">
                  <code>{screen.route}</code> · {screen.states.length} {screen.states.length === 1 ? "state" : "states"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
