"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { tokens } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", tokens.colors.primary);
    root.style.setProperty("--color-secondary", tokens.colors.secondary);
    root.style.setProperty("--color-background", tokens.colors.background);
    
    // Convert hex to rgb for tailwind opacity support if needed
    // This is a simplified version just setting hex
    
  }, [tokens]);

  return <>{children}</>;
}
