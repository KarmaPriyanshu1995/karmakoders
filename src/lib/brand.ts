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

export function telFromDisplay(display: string) {
  const raw = display.replace(/[^\d+]/g, "");
  return raw.startsWith("+") ? raw : raw ? `+${raw}` : "";
}

export function usPhoneTel() {
  return telFromDisplay(BRAND.usPhoneDisplay);
}

/** US number first when present — India is always listed. */
export function brandPhones(brand: {
  inPhoneDisplay: string;
  inPhoneTel: string;
  usPhoneDisplay: string;
} = BRAND) {
  const india = { label: "India", display: brand.inPhoneDisplay, tel: brand.inPhoneTel };
  const usTel = telFromDisplay(brand.usPhoneDisplay);
  if (brand.usPhoneDisplay?.trim() && usTel) {
    return [{ label: "US", display: brand.usPhoneDisplay, tel: usTel }, india];
  }
  return [india];
}

export function whatsappHref(text?: string, number = BRAND.whatsapp) {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
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
