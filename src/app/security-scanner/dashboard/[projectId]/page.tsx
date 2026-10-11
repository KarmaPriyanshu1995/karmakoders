import type { Metadata } from "next";
import { DashboardClient } from "@/components/scanner/DashboardClient";

export const metadata: Metadata = {
  title: "Security Dashboard | KarmaKoders",
  description: "Project security posture: findings, grade, scans and API Security coverage.",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ projectId: string }> };

export default async function DashboardPage({ params }: Props) {
  const { projectId } = await params;
  return <DashboardClient projectId={projectId} />;
}
