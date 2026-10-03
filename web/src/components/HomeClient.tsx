"use client";

import { ScanForm } from "@/components/ScanForm";
import { ScannerShell } from "@/components/scanner/ScannerShell";
import { StatusBadge } from "@/components/scanner/ui";

type Props = {
  initialUrl?: string;
  initialRepo?: string;
};

export function HomeClient({ initialUrl = "", initialRepo = "" }: Props) {
  return (
    <ScannerShell
      title="New security scan"
      subtitle="Paste a URL or authorize a GitHub repository"
      badge={<StatusBadge label="Safe by default" tone="info" />}
    >
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="scanner-card-pad">
          <p className="scanner-label">Start</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            A plain-English security check for apps built with AI.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Passive checks run immediately. Deeper discovery and fuzzing stay ownership-gated.
            Findings are evidence-backed. AI explanations are optional and cannot change the grade.
          </p>
          <ScanForm initialUrl={initialUrl} initialRepo={initialRepo} />
        </section>

        <aside className="space-y-4" id="trust">
          <div className="scanner-card-pad">
            <p className="scanner-label">Trust</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Non-destructive checks only</li>
              <li>Ownership required for active discovery</li>
              <li>SSRF and off-host redirect protection</li>
              <li>Redacted evidence — secrets never shown raw</li>
              <li>Deterministic grade; AI is post-truth and labeled</li>
            </ul>
          </div>
          <div className="scanner-card-pad">
            <p className="scanner-label">What you get</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Security grade (A–F)</li>
              <li>Attack-surface inventory</li>
              <li>Findings with confidence + verification</li>
              <li>Founder and developer modes</li>
              <li>Verify Fix after remediation</li>
            </ul>
          </div>
        </aside>
      </div>
    </ScannerShell>
  );
}
