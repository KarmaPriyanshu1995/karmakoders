"use client";

import { useEffect, useState } from "react";

export function ActiveNow({ initial, query }: { initial: number; query: string }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/usage/live?${query}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { activeNow?: number };
        if (typeof data.activeNow === "number") setCount(data.activeNow);
      } catch {
        // Keep the last known count if the poll fails.
      }
    }, 20000);
    return () => window.clearInterval(timer);
  }, [query]);

  return <p className="text-3xl font-black text-white mt-2">{count.toLocaleString()}</p>;
}
