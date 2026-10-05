"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  IconDashboard,
  IconMenu,
  IconRadar,
  IconScan,
  IconShield,
  IconX,
} from "@/components/scanner/icons";

const NAV = [
  { href: "/", label: "New scan", icon: "scan" as const, match: (p: string) => p === "/" },
  { href: "/#trust", label: "How it works", icon: "shield" as const, match: () => false },
];

function NavIcon({ name, className }: { name: "scan" | "shield" | "dashboard"; className?: string }) {
  if (name === "shield") return <IconShield className={className} aria-hidden="true" />;
  if (name === "dashboard") return <IconDashboard className={className} aria-hidden="true" />;
  return <IconScan className={className} aria-hidden="true" />;
}

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
};

export function ScannerShell({ children, title, subtitle, badge, actions }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const onScan = pathname.startsWith("/scans/");

  return (
    <div className="min-h-screen text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-scanner-brand focus:px-3 focus:py-2 focus:text-scanner-on-brand"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-scanner-bg/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="scanner-btn-ghost -ml-2 px-2"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <IconX className="h-5 w-5" aria-hidden="true" />
          ) : (
            <IconMenu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-scanner-brand-label">KarmaKoders</p>
          <p className="text-sm font-semibold">Security Scanner</p>
        </div>
        <span className="w-9" aria-hidden="true" />
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-scanner-bg p-4 shadow-scanner">
            <Brand />
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} onScan={onScan} />
          </nav>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-scanner-bg/60 px-4 py-6 backdrop-blur-xl lg:flex">
          <Brand />
          <NavLinks pathname={pathname} onScan={onScan} />
          <div className="mt-auto space-y-3 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-500">
            <p>Safe by default · Ownership-gated active checks</p>
            <p>Evidence-backed findings · AI cannot change the grade</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-white/10 bg-scanner-bg/40 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="scanner-label">Security Scanner</p>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-white md:text-2xl">
                  {title || "KarmaKoders"}
                </h1>
                {subtitle ? (
                  <p className="scanner-mono mt-1 break-all text-slate-400">{subtitle}</p>
                ) : null}
                {badge ? <div className="mt-3 flex flex-wrap gap-2">{badge}</div> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
          </div>

          <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>

          <footer className="border-t border-white/10 px-4 py-6 text-sm leading-relaxed text-slate-500 md:px-8">
            A scan is not a guarantee of security, and it is not a substitute for a professional
            pentest. Non-destructive checks only.
          </footer>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="mb-8 block rounded-xl px-2 py-1 hover:bg-white/5">
      <p className="text-xs font-bold uppercase tracking-widest text-scanner-brand-label">KarmaKoders</p>
      <div className="mt-1 flex items-center gap-2 text-base font-semibold text-white">
        <IconRadar className="h-4 w-4 text-scanner-brand-label" aria-hidden="true" />
        Security Scanner
      </div>
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  onScan,
}: {
  pathname: string;
  onNavigate?: () => void;
  onScan: boolean;
}) {
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = item.match(pathname);
        return (
          <li key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-scanner-brand-soft text-scanner-brand-label"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
      {onScan ? (
        <li>
          <span className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-medium text-scanner-brand-label">
            <NavIcon name="dashboard" className="h-4 w-4 shrink-0" />
            Current report
          </span>
        </li>
      ) : null}
    </ul>
  );
}
