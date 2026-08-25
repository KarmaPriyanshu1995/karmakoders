/** Thrown whenever a caller isn't authorized for the tenant/resource it asked for. */
export class TenantAccessError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "TenantAccessError";
  }
}

/** Safe, serializable message to return from a Server Action instead of throwing. */
export function publicActionError(error: unknown): string {
  if (error instanceof TenantAccessError) {
    if (error.message.includes("lacks permission")) {
      return "You don't have permission to do that.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
