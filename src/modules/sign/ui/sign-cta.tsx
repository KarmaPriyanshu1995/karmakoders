import Link from "next/link";
import { Button, type ButtonProps } from "@/components/product-ui";
import type { SignCta } from "@/modules/sign/launch";

/** Renders a launch-aware CTA from getSignPrimaryCta. */
export function SignCtaButton({
  cta,
  size = "lg",
  variant = "default",
}: {
  cta: SignCta;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
}) {
  return (
    <Button asChild size={size} variant={variant}>
      <Link href={cta.href} data-cta-kind={cta.kind}>
        {cta.label}
      </Link>
    </Button>
  );
}
