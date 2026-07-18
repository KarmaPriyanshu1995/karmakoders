"use client";

import { usePathname } from "next/navigation";

export default function CanonicalURL() {
  const pathname = usePathname();
  
  // Clean up potential trailing slashes except for root
  const cleanPathname = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  const canonicalUrl = `https://karmakoders.com${cleanPathname}`;

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
    </>
  );
}
