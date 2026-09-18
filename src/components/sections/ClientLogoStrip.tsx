import { CLIENT_LOGO_LABEL, CLIENT_LOGOS } from "@/lib/social-proof";

export function ClientLogoStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "mt-10 w-full" : "mt-14 w-full"}>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5 text-center md:text-left">
        {CLIENT_LOGO_LABEL}
      </p>
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-8 gap-y-4">
        {CLIENT_LOGOS.map((logo) => (
          <span
            key={logo.name}
            className="text-sm sm:text-base font-black tracking-[0.18em] uppercase text-white/35 grayscale hover:text-white/70 transition-colors"
          >
            {logo.name}
          </span>
        ))}
      </div>
    </div>
  );
}
