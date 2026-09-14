"use client";

import { DomainCompareTool } from "@/components/tools/DomainCompareTool";
import { CompressImageTool } from "@/components/tools/CompressImageTool";
import { MvpCostCalculator } from "@/components/tools/MvpCostCalculator";
import type { ToolEmbedId } from "@/types/content";

const AFFILIATE_DISCLOSURE =
  "Disclosure: Some links on this page may be affiliate links. We may earn a commission if you purchase through our links, at no additional cost to you.";

export function ToolEmbed({ tool }: { tool: ToolEmbedId }) {
  return (
    <div className="my-10">
      {tool === "DOMAIN_COMPARE" && (
        <DomainCompareTool initialDomain="" disclosure={AFFILIATE_DISCLOSURE} />
      )}
      {tool === "IMAGE_COMPRESSOR" && <CompressImageTool />}
      {tool === "MVP_COST_CALCULATOR" && <MvpCostCalculator compact />}
    </div>
  );
}
