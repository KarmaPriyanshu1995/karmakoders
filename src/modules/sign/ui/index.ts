export { LegalDisclaimer } from "./legal-disclaimer";
export { BlockedTypesNotice } from "./blocked-types-notice";
export { TemplatePreview } from "./template-preview";
export { EarlyAccessForm } from "./early-access-form";
export { SignCtaButton } from "./sign-cta";
export { FaqList, type FaqItem } from "./faq-list";
export { TemplateCard } from "./template-card";
export { SignFooter, SIGN_FOOTER_LINKS } from "./sign-footer";
export { ComparisonTable } from "./comparison-table";
export { BillingIntervalToggle } from "./pricing/billing-interval-toggle";
export { PlanCard } from "./pricing/plan-card";
export { PlanCta } from "./pricing/plan-cta";
export { SignerNotice, SignerLinkInvalid, SignerNotYourTurn, SignerSessionExpired } from "./signer-notice";

// Sign design system (docs/DESIGN.md). This barrel holds only server-safe parts, because the
// public marketing pages import it and must not pull Radix or other client code into their bundle.
// Client components are imported by path: "@/modules/sign/ui/form", "/dialog", "/dropdown-menu",
// "/tabs", "/tooltip", "/toast", "/copy-button", "/account-menu", "/typed-signature-loader".
export { TONES, SITE_BACKGROUNDS, contrastRatio, toneContrast, type Tone } from "./colors";
export {
  DOCUMENT_STATUS,
  SIGNER_STATUS,
  SIGN_SIGNER_STATUSES,
  documentStatusLabel,
  type SignSignerStatusName,
  type SignedCounts,
  type StatusMeta,
} from "./status";
export { Button, IconButton, type ButtonProps, type ButtonVariant, type ButtonSize, type IconButtonProps } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
export { StatusBadge, ToneBadge } from "./status-badge";
export { Alert, Skeleton, EmptyState, ErrorState } from "./feedback";
export { Stepper, Avatar, initialsFrom, CreditBalanceChip, formatCredits, ProgressMeter, Kbd } from "./display";
export { DocumentFrame } from "./document-frame";
