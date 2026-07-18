import { ReactNode } from "react";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FFC300] opacity-[0.015] blur-[200px] pointer-events-none rounded-full" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
