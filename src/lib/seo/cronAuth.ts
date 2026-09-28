export function authorizeCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");

  if (secret) {
    return auth === `Bearer ${secret}` || headerSecret === secret;
  }

  return process.env.NODE_ENV !== "production";
}
