import "server-only";

/**
 * Product DB access for Platform* and Sign* models.
 * Reuses the shared Prisma client / Neon pool — never imports CMS domain helpers.
 */
export { prisma, withDbRetry } from "@/lib/prisma";
export {
  canTransitionSignStatus,
  freeUsagePeriodKey,
  SIGN_DOCUMENT_STATUSES,
  SIGN_STATUS_TRANSITIONS,
  type SignDocumentStatusName,
} from "./sign-status";
