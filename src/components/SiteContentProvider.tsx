"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";

const SiteContentContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT);

export function SiteContentProvider({
  value,
  children,
}: {
  value: SiteContent;
  children: React.ReactNode;
}) {
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
