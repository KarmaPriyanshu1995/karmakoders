"use client";

import { usePathname } from "next/navigation";
import { isSensitivePath } from "@/platform/privacy/sensitive-paths";

export default function CanonicalURL() {
  const pathname = usePathname();

  // Token-bearing URLs (signer links) must never be echoed into a canonical tag.
  if (isSensitivePath(pathname)) return null;

  // Clean up potential trailing slashes except for root
  const cleanPathname = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  const canonicalUrl = `https://www.karmakoders.com${cleanPathname}`;

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
    </>
  );
}
