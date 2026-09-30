import { ScanLiveView } from "@/components/ScanLiveView";

type Props = { params: { id: string } };

export default function ScanPage({ params }: Props) {
  return <ScanLiveView scanId={params.id} />;
}
