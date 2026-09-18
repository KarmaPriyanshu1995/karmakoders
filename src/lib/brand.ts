export const BRAND = {
  legalName: "Karmakoders Technologies",
  shortName: "Karmakoders",
  email: "info@karmakoders.com",
  hours: "Mon–Fri: 9AM – 6PM EST (US support hours)",
  address: "JLN Marg, Malviya Nagar, Jaipur, Rajasthan",
  inPhoneDisplay: "+91 86900 71861",
  inPhoneTel: "+918690071861",
  usPhoneDisplay: (process.env.NEXT_PUBLIC_US_PHONE || "").trim(),
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918690071861").replace(/\D/g, ""),
  calUrl: process.env.NEXT_PUBLIC_CAL_URL || "https://cal.com",
} as const;

export function usPhoneTel() {
  const raw = BRAND.usPhoneDisplay.replace(/[^\d+]/g, "");
  return raw.startsWith("+") ? raw : raw ? `+${raw}` : "";
}

/** US number first when present — India is always listed. */
export function brandPhones() {
  const india = { label: "India", display: BRAND.inPhoneDisplay, tel: BRAND.inPhoneTel };
  const usTel = usPhoneTel();
  if (BRAND.usPhoneDisplay && usTel) {
    return [{ label: "US", display: BRAND.usPhoneDisplay, tel: usTel }, india];
  }
  return [india];
}

export function whatsappHref(text?: string) {
  const base = `https://wa.me/${BRAND.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function isBookableUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const known = host === "cal.com" || host.endsWith(".cal.com") || host === "calendly.com" || host.endsWith(".calendly.com");
    return known && parsed.pathname.replace(/\/$/, "").length > 0;
  } catch {
    return false;
  }
}
