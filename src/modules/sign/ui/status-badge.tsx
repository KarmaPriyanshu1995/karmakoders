import { Badge } from "@/components/product-ui";
import type { SignDocumentStatusName } from "@/platform/db/sign-status";
import { cn } from "@/lib/utils";
import { TONES, type Tone } from "./colors";
import {
  DOCUMENT_STATUS,
  SIGNER_STATUS,
  documentStatusLabel,
  type SignSignerStatusName,
  type SignedCounts,
  type StatusMeta,
} from "./status";

/** Site badge in a semantic tone, with an icon and text so it never relies on colour alone. */
export function ToneBadge({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: Tone;
  icon?: StatusMeta["icon"];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap", TONES[tone].classes, className)}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
      {children}
    </Badge>
  );
}

type StatusBadgeProps =
  | { kind?: "document"; status: SignDocumentStatusName; counts?: SignedCounts; className?: string }
  | { kind: "signer"; status: SignSignerStatusName; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  if (props.kind === "signer") {
    const meta = SIGNER_STATUS[props.status];
    return (
      <ToneBadge tone={meta.tone} icon={meta.icon} className={props.className}>
        {meta.label}
      </ToneBadge>
    );
  }
  const meta = DOCUMENT_STATUS[props.status];
  return (
    <ToneBadge tone={meta.tone} icon={meta.icon} className={props.className}>
      {documentStatusLabel(props.status, props.counts)}
    </ToneBadge>
  );
}
