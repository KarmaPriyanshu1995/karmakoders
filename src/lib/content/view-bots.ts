const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|pagespeed/i;

export function isBotUserAgent(userAgent: string | null | undefined) {
  return Boolean(userAgent && BOT_UA.test(userAgent));
}
