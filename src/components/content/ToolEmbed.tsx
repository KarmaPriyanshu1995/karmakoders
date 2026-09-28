"use client";

import { DomainCompareTool } from "@/components/tools/DomainCompareTool";
import { CompressImageTool } from "@/components/tools/CompressImageTool";
import { MvpCostCalculator } from "@/components/tools/MvpCostCalculator";
import type { ToolEmbedId } from "@/types/content";
import { UsageBeacon } from "@/components/tools/UsageBeacon";

const TOOL_SLUG: Record<ToolEmbedId, string> = {
  DOMAIN_COMPARE: "domain-compare",
  IMAGE_COMPRESSOR: "compress-image",
  MVP_COST_CALCULATOR: "mvp-cost-calculator",
};

const AFFILIATE_DISCLOSURE =
  "Disclosure: Some links on this page may be affiliate links. We may earn a commission if you purchase through our links, at no additional cost to you.";

export function ToolEmbed({ tool }: { tool: ToolEmbedId }) {
  return (
    <div className="my-10">
      <UsageBeacon tool={TOOL_SLUG[tool]} />
      {tool === "DOMAIN_COMPARE" && (
        <DomainCompareTool initialDomain="" disclosure={AFFILIATE_DISCLOSURE} />
      )}
      {tool === "IMAGE_COMPRESSOR" && <CompressImageTool />}
      {tool === "MVP_COST_CALCULATOR" && <MvpCostCalculator compact />}
    </div>
  );
}
