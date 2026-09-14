import type { Metadata } from "next";
import { ContentHub } from "@/components/content/ContentHub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Success Stories | karmakoders",
  description: "Client ROI, delivery metrics, and verified outcomes from KarmaKoders projects.",
};

export default function SuccessStoriesPage() {
  return (
    <ContentHub
      type="success-story"
      heading="Success Stories"
      description="Hard ROI, delivery speed, and client proof — not vanity case-study copy."
    />
  );
}
