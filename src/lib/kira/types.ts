export type KiraUiState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "ended";

export type LeadTemperature = "HOT" | "WARM" | "EXPLORING";

export type KarmaServiceSlug =
  | "ai-solutions"
  | "saas-products"
  | "website-engineering"
  | "mobile-apps"
  | "custom-software"
  | "ui-ux-design"
  | "cloud-devops"
  | "custom-scope";

export interface LeadProfile {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  intent?: string;
  projectType?: string;
  stage?: string;
  problem?: string;
  features?: string[];
  platform?: string;
  timeline?: string;
  budget?: string;
  existingProduct?: string;
  primaryService?: KarmaServiceSlug;
  secondaryService?: KarmaServiceSlug;
  serviceReason?: string;
  summary?: string;
  temperature?: LeadTemperature;
  pagePath?: string;
}

export interface TranscriptLine {
  id: string;
  role: "kira" | "visitor";
  text: string;
  at: number;
}

export interface KiraCta {
  label: string;
  href: string;
}

export const SERVICE_LABELS: Record<KarmaServiceSlug, string> = {
  "ai-solutions": "AI Solutions & Integrations",
  "saas-products": "SaaS Development",
  "website-engineering": "Website Development",
  "mobile-apps": "Mobile App Development",
  "custom-software": "Custom Software Development",
  "ui-ux-design": "UI/UX Design & Branding",
  "cloud-devops": "Cloud Engineering & DevOps",
  "custom-scope": "Bespoke Enterprise Solutions",
};
