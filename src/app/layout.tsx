import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

const fontVariables = `${inter.variable} ${outfit.variable}`;

export const metadata: Metadata = {
  title: "AI Business Portfolio",
  description: "Premium AI-powered business portfolio platform",
  metadataBase: new URL("https://karmakoders.com"),
  verification: {
    google: "uO__zcdAWvEBhoUqJoqCJxMsmLYDh2wGYW7dw2nVxlI",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { getSiteConfig } from "@/lib/data";
import { GoogleAnalytics } from "@next/third-parties/google";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getSiteConfig("globalTheme");
  const mode = config?.mode || config?.theme || "dark";
  const isDark = mode === "dark";

  const bgType = config?.bgType || "solid";
  const bgGradient = config?.bgGradient || "linear-gradient(to right, #252422, #1c1c1b)";
  const bgColor = config?.bgColor || (isDark ? "#252422" : "#f8fafc");
  const textColor = config?.textColor || (isDark ? "#ffffff" : "#0f172a");
  const primaryColor = config?.primaryColor || "#FFC300";
  const fontFamilyRaw = config?.fontFamily || "var(--font-inter)";
  const fontFamily =
    {
      "var(--font-roboto)": "var(--font-inter)",
      "var(--font-poppins)": "var(--font-outfit)",
      "var(--font-playfair)": "var(--font-outfit)",
    }[fontFamilyRaw as string] ?? fontFamilyRaw;
  const borderRadius = config?.borderRadius || "0.5rem";

  const isDarkTheme = isDark;
  
  // Custom Color Constants from User
  const primaryAccent = "#FFC300";
  const mainBg = isDarkTheme ? "#252422" : "#F5F3EF";
  const secondaryBg = isDarkTheme ? "#1C1B1A" : "#EAE7E1";
  const primaryText = isDarkTheme ? "#FFFFFF" : "#1C1B1A";
  const secondaryText = isDarkTheme ? "#A39F97" : "#5F5B53";
  const borderColor = isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const glowColor = "rgba(255, 195, 0, 0.25)";

  const bodyBgStyle = `background-color: ${mainBg} !important; background-image: none !important;`;

  const customStyles = `
    :root {
      --font-sans: ${fontFamily};
      
      --primary-accent: ${primaryAccent};
      --main-bg: ${mainBg};
      --secondary-bg: ${secondaryBg};
      --primary-text: ${primaryText};
      --secondary-text: ${secondaryText};
      --border-color: ${borderColor};
      --glow-color: ${glowColor};
      
      /* Glass Card Styles */
      --glass-bg: ${isDarkTheme ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.015)"};
      --glass-border: ${isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"};
      --glass-shadow: ${isDarkTheme ? "rgba(255, 195, 0, 0.04)" : "rgba(0, 0, 0, 0.015)"};
      
      /* Tailwind Overrides */
      --color-slate-50: var(--primary-text) !important;
      --color-slate-100: var(--primary-text) !important;
      --color-slate-200: var(--primary-text) !important;
      --color-slate-300: var(--primary-text) !important;
      --color-slate-400: var(--secondary-text) !important;
      --color-slate-500: var(--secondary-text) !important;
      --color-slate-600: var(--secondary-text) !important;
      
      --color-indigo-400: var(--primary-accent) !important;
      --color-indigo-500: var(--primary-accent) !important;
      --color-indigo-600: var(--primary-accent) !important;
      
      --color-primary: var(--primary-accent) !important;
      --color-background: var(--main-bg) !important;
      
      --radius: ${borderRadius};
      --radius-sm: calc(${borderRadius} - 2px);
      --radius-md: ${borderRadius};
      --radius-lg: calc(${borderRadius} + 2px);
      --radius-xl: calc(${borderRadius} + 4px);
    }
    body {
      ${bodyBgStyle}
      color: var(--primary-text) !important;
      font-family: var(--font-sans), sans-serif;
    }
    
    /* Semantic Layout Overrides */
    .bg-slate-950 { background-color: var(--main-bg) !important; }
    .bg-slate-900 { background-color: var(--secondary-bg) !important; }
    .bg-slate-900\\/40 { background-color: var(--glass-bg) !important; }
    
    .border-slate-800 { border-color: var(--border-color) !important; }
    .border-slate-700 { border-color: var(--border-color) !important; }
    .border-white\\/5 { border-color: var(--border-color) !important; }
    .border-white\\/10 { border-color: var(--border-color) !important; }
    
    .text-white { color: var(--primary-text) !important; }
    .text-\\[\\#D6D6D6\\] { color: var(--secondary-text) !important; }
    .text-slate-300 { color: var(--primary-text) !important; }
    .text-slate-400 { color: var(--secondary-text) !important; }
    .text-slate-500 { color: var(--secondary-text) !important; }
    
    /* Ensure filled yellow buttons preserve dark text contrast */
    .text-slate-950 { color: #1C1B1A !important; }
    .text-\\[\\#1C1B1A\\] { color: #1C1B1A !important; }
    
    /* Apply border radius globally to rounded utilities */
    .rounded-lg { border-radius: var(--radius-lg); }
    .rounded-xl { border-radius: var(--radius-xl); }
    .rounded-md { border-radius: var(--radius-md); }
  `;

  const htmlClass = `${fontVariables} h-full antialiased ${isDark ? "dark" : ""}`.trim();
  const bodyClass = "min-h-full flex flex-col selection:bg-indigo-500/30 transition-colors duration-300";

  return (
    <html lang="en" className={htmlClass} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: customStyles }} suppressHydrationWarning />
      </head>
      <body className={bodyClass} suppressHydrationWarning>
        <ThemeProvider initialConfig={config}>
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
        <GoogleAnalytics gaId="G-NG3CPDVF6F" />
      </body>
    </html>
  );
}
