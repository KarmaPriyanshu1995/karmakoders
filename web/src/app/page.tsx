import { HomeClient } from "@/components/HomeClient";

type Props = {
  searchParams?: {
    url?: string | string[];
    repo?: string | string[];
  };
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function HomePage({ searchParams }: Props) {
  return (
    <HomeClient
      initialUrl={firstParam(searchParams?.url)}
      initialRepo={firstParam(searchParams?.repo)}
    />
  );
}
