import { HomeClient } from "@/components/scanner/HomeClient";

type Props = {
  searchParams: Promise<{
    url?: string | string[];
    repo?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function SecurityScannerPage({ searchParams }: Props) {
  const query = await searchParams;
  return <HomeClient initialUrl={firstParam(query.url)} initialRepo={firstParam(query.repo)} />;
}
