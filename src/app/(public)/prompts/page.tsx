import type { Metadata } from "next";
import { ContentHub } from "@/components/content/ContentHub";
import { canonicalUrl } from "@/lib/seo/canonical";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Prompts | karmakoders",
  description: "Copy-ready Cursor, Claude, and video prompts with variables and usage steps.",
  alternates: { canonical: canonicalUrl("/prompts") },
};

export default function PromptsPage() {
  return (
    <ContentHub
      type="prompt"
      heading="Free Prompts"
      description="Copy a prompt, fill the variables, and see a real output preview."
    />
  );
}
