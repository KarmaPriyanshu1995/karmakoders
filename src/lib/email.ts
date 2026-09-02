/** Canonical form for stored and looked-up emails. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}