import Link from "next/link";
import { Button } from "@/components/product-ui";
import type { PlanCtaAction } from "@/modules/sign/launch";

/**
 * The one place a pricing card turns into an action. Today: a link (early access or sign-up).
 * A later step adds a `checkout` kind here (e.g. a client Paddle button) without touching cards.
 */
export function PlanCta({ action, highlighted = false }: { action: PlanCtaAction; highlighted?: boolean }) {
  return (
    <Button asChild variant={highlighted ? "default" : "outline"} className="w-full">
      <Link href={action.href} data-cta-kind={action.kind}>
        {action.label}
      </Link>
    </Button>
  );
}
