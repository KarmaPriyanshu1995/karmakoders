import type { Metadata } from "next";
import { ScanLiveView } from "@/components/scanner/ScanLiveView";

// Individual reports are private-by-URL: never index them.
export const metadata: Metadata = {
  title: "Scan report | KarmaKoders Security Scanner",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function ScanPage({ params }: Props) {
  const { id } = await params;
  return <ScanLiveView scanId={id} />;
}
