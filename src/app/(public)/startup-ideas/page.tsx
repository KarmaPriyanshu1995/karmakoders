import type { Metadata } from "next";
import { ContentHub } from "@/components/content/ContentHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Startup Ideas | karmakoders",
  description: "4-week ready-to-build MVP blueprints with stack, scope, and budget.",
};

export default function StartupIdeasPage() {
  return (
    <ContentHub
      type="startup-idea"
      heading="Startup Ideas"
      description="4-week MVP blueprints: market, scope, stack, and a realistic budget badge."
    />
  );
}
