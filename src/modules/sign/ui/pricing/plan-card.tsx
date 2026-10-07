import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge, Card, CardContent, CardHeader } from "@/components/product-ui";

/** Server-rendered plan card. `price` may contain interval-specific variants (see toggle). */
export function PlanCard({
  name,
  description,
  price,
  features,
  cta,
  badge,
  highlighted = false,
}: {
  name: string;
  description: string;
  price: ReactNode;
  features: readonly string[];
  cta: ReactNode;
  badge?: string;
  highlighted?: boolean;
}) {
  return (
    <Card className={`flex h-full flex-col ${highlighted ? "border-[#FFC300]/60" : ""}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-white">{name}</h3>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        <div className="min-h-16">{price}</div>
        <p className="text-sm text-[#A39F97]">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <ul className="space-y-2 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2 text-white">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[#FFC300]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {cta}
      </CardContent>
    </Card>
  );
}
