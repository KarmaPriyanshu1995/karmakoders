import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = {
  title: "Page Not Found | karmakoders",
  description: "The page you are looking for does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return <NotFoundView />;
}
