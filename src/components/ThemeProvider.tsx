"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";

interface ThemeProviderProps {
  children: React.ReactNode;
  initialConfig?: {
    mode?: string;
    theme?: string;
    bgType?: string;
    bgColor?: string;
    textColor?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    borderRadius?: string;
  } | null;
}

export function ThemeProvider({ children, initialConfig }: ThemeProviderProps) {
  const { tokens, setTokens } = useThemeStore();

  useEffect(() => {
    if (initialConfig) {
      setTokens({
        colors: {
          primary: initialConfig.primaryColor || "#FFC300",
          secondary: initialConfig.secondaryColor || "#06b6d4",
          background: initialConfig.bgColor || "#252422",
        },
        typography: {
          heading: initialConfig.fontFamily || "Inter",
          body: initialConfig.fontFamily || "Inter",
        },
      });
    }
  }, [initialConfig, setTokens]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", tokens.colors.primary);
    root.style.setProperty("--color-secondary", tokens.colors.secondary);
    root.style.setProperty("--color-background", tokens.colors.background);
  }, [tokens]);

  return <>{children}</>;
}
