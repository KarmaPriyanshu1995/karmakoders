/** Thrown whenever a caller isn't authorized for the tenant/resource it asked for. */
export class TenantAccessError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "TenantAccessError";
  }
}
