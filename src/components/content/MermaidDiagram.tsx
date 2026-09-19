"use client";

import { useEffect, useId, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

export function MermaidDiagram({ chart, caption = "System Architecture" }: MermaidDiagramProps) {
  const rawId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const renderChart = async () => {
      if (!chart.trim() || !containerRef.current) {
        setRendering(false);
        return;
      }
      setRendering(true);
      setError(null);
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "dark",
          themeVariables: {
            background: "#09090b",
            primaryColor: "#3b82f6",
            primaryTextColor: "#f4f4f5",
            lineColor: "#60a5fa",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
          },
        });
        const id = `mermaid-${rawId}-${Date.now().toString(36)}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector("svg");
        svgEl?.setAttribute("role", "img");
        svgEl?.setAttribute("aria-label", caption);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not render this diagram.");
        if (containerRef.current) containerRef.current.innerHTML = "";
      } finally {
        if (!cancelled) setRendering(false);
      }
    };
    void renderChart();
    return () => {
      cancelled = true;
    };
  }, [caption, chart, rawId]);

  return (
    <figure className="my-10 rounded-2xl border border-white/10 bg-zinc-950 p-4 md:p-6">
      <figcaption className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">{caption}</figcaption>
      <div
        ref={containerRef}
        className="overflow-x-auto min-h-[240px] flex items-center justify-center text-slate-400"
        aria-busy={rendering}
      />
      {rendering && <p className="text-xs text-slate-500 mt-2">Rendering diagram…</p>}
      {error && <p className="text-sm text-rose-400 mt-3">Diagram error: {error}</p>}
    </figure>
  );
}
