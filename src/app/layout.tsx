import type { Metadata } from "next";
import { Inter, Roboto, Poppins, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import "@uploadthing/react/styles.css";


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const roboto = Roboto({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-roboto" });
const poppins = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-poppins" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

const fontVariables = `${inter.variable} ${roboto.variable} ${poppins.variable} ${outfit.variable} ${playfair.variable}`;

export const metadata: Metadata = {
  title: "AI Business Portfolio",
  description: "Premium AI-powered business portfolio platform",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { getSiteConfig } from "@/lib/actions";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getSiteConfig("globalTheme");
  const mode = config?.mode || config?.theme || "dark";
  const isDark = mode === "dark";

  const bgType = config?.bgType || "solid";
  const bgGradient = config?.bgGradient || "linear-gradient(to right, #020617, #0f172a)";
  const bgColor = config?.bgColor || (isDark ? "#020617" : "#f8fafc");
  const textColor = config?.textColor || (isDark ? "#f8fafc" : "#0f172a");
  const primaryColor = config?.primaryColor || "#4f46e5";
  const fontFamily = config?.fontFamily || "var(--font-inter)";
  const borderRadius = config?.borderRadius || "0.5rem";

  const bodyBgStyle = bgType === "gradient" 
    ? `background-image: ${bgGradient} !important; background-color: transparent !important;` 
    : `background-color: ${bgColor} !important; background-image: none !important;`;

  // Override Tailwind's default colors that are heavily used in the UI
  // This ensures the chosen theme propagates to all components using these classes.
  const customStyles = `
    :root {
      --font-sans: ${fontFamily};
      
      --color-slate-950: ${bgColor};
      --color-slate-900: ${bgColor};
      --color-slate-50: ${textColor};
      --color-indigo-500: ${primaryColor};
      --color-indigo-600: ${primaryColor};
      
      --radius: ${borderRadius};
      --radius-sm: calc(${borderRadius} - 2px);
      --radius-md: ${borderRadius};
      --radius-lg: calc(${borderRadius} + 2px);
      --radius-xl: calc(${borderRadius} + 4px);
    }
    body {
      ${bodyBgStyle}
      color: ${textColor} !important;
      font-family: var(--font-sans), sans-serif;
    }
    
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
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      </head>
      <body className={bodyClass} suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
