"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Phone, X } from "lucide-react";
import { isBookableUrl, whatsappHref } from "@/lib/brand";
import { trackEvent } from "@/lib/analytics";
import { useSiteContent } from "@/components/SiteContentProvider";

function hideOn(pathname: string | null) {
  if (!pathname) return true;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname === "/contact"
  );
}

export function ConversionWidgets() {
  const pathname = usePathname();
  const { brand } = useSiteContent();
  const [exitOpen, setExitOpen] = useState(false);
  const bookHref = isBookableUrl(brand.calUrl) ? brand.calUrl : "/contact";
  const wa = whatsappHref("Hi Karmakoders — I’d like to discuss a project.", brand.whatsapp);

  useEffect(() => {
    if (hideOn(pathname)) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("kk-exit-intent") === "1") return;

    const onLeave = (event: MouseEvent) => {
      if (event.clientY > 8) return;
      window.sessionStorage.setItem("kk-exit-intent", "1");
      setExitOpen(true);
    };

    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [pathname]);

  if (hideOn(pathname)) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 pointer-events-none [&>*]:pointer-events-auto max-sm:bottom-4 max-sm:right-4">
        <Link
          href={bookHref}
          onClick={() => trackEvent("cta_click", { location: "sticky", cta: "book" })}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-indigo-500 text-slate-950 font-black text-sm shadow-lg hover:bg-indigo-400"
        >
          <Phone className="w-4 h-4" /> Book a call
        </Link>
        <a
          href={wa}
          onClick={() => trackEvent("whatsapp_click", { location: "sticky_global" })}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white/10 border border-white/15 text-white font-bold text-sm backdrop-blur hover:bg-white/15"
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
      </div>

      {exitOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1C1B1A] border border-white/10 p-6 relative">
            <button
              type="button"
              onClick={() => setExitOpen(false)}
              className="absolute top-3 right-3 text-slate-500 hover:text-white"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Before you go</p>
            <h2 className="text-2xl font-black text-white mb-2">Get a scoped estimate in one call.</h2>
            <p className="text-sm text-slate-400 mb-5">NDA-first, EST overlap, USD pricing. No fake US number — book or WhatsApp the team you already have.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/free-tools/mvp-cost-calculator"
                onClick={() => {
                  trackEvent("cta_click", { location: "exit_intent", cta: "calculator" });
                  setExitOpen(false);
                }}
                className="flex-1 text-center px-4 py-3 rounded-xl bg-indigo-500 text-slate-950 font-black text-sm"
              >
                Estimate my MVP
              </Link>
              <Link
                href={bookHref}
                onClick={() => {
                  trackEvent("cta_click", { location: "exit_intent", cta: "book" });
                  setExitOpen(false);
                }}
                className="flex-1 text-center px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm"
              >
                Book discovery
              </Link>
              <a
                href={wa}
                onClick={() => trackEvent("whatsapp_click", { location: "exit_intent" })}
                className="flex-1 text-center px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
