import { ReactNode } from "react";
import { SeoSidebar } from "@/components/admin/seo/SeoSidebar";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] -m-8">
      <SeoSidebar />
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FFC300] opacity-[0.015] blur-[200px] pointer-events-none rounded-full" />
        <div className="relative z-10 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
