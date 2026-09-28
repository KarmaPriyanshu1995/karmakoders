export type ConversionEvent =
  | "cta_click"
  | "form_submit"
  | "calendly_booked"
  | "whatsapp_click"
  | "calculator_complete"
  | "calculator_lead";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: ConversionEvent, params: Record<string, string> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  } catch {
    // Tracking must never break the page.
  }
}
