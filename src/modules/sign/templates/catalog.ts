export type TemplateFieldType = "text" | "email" | "date" | "textarea" | "number";

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
}

export interface TemplateSignerRole {
  key: string;
  label: string;
  description: string;
}

export interface TemplateFaq {
  question: string;
  answer: string;
}

export type TemplateCategory =
  | "nda"
  | "contractor"
  | "hr"
  | "consent"
  | "certificate";

export interface SignTemplateMeta {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: TemplateCategory;
  whoUsesIt: string[];
  fields: TemplateField[];
  signerRoles: TemplateSignerRole[];
  faq: TemplateFaq[];
}

/** Document types KarmaKoders Sign must refuse (PRD §7). */
export const BLOCKED_DOCUMENT_TYPES = [
  "Wills, codicils, and testamentary trusts",
  "Court filings and court-ordered documents",
  "Adoption, divorce, and other family-law documents",
  "Notarized or witnessed deeds / instruments that require a notary or wet ink",
  "Anything that requires wet-ink signatures under applicable law",
] as const;

export const SIGN_TEMPLATES: SignTemplateMeta[] = [
  {
    slug: "mutual-nda",
    name: "Mutual NDA",
    shortDescription: "Two-way confidentiality so both parties can share sensitive information safely.",
    longDescription: `A mutual non-disclosure agreement binds both sides to keep confidential information private. Use it before pitching, partnering, or exchanging product and customer data.

This template covers the definition of confidential information, permitted use, exclusions (such as public knowledge), and how long obligations last. It is written in plain English for small businesses and agencies.

KarmaKoders Sign provides a simple electronic signature only. Confirm this form is appropriate in your jurisdiction before sending.`,
    category: "nda",
    whoUsesIt: ["Agency owners", "Startups", "Freelancers", "Partnerships"],
    fields: [
      { key: "party_a_name", label: "Party A legal name", type: "text", required: true },
      { key: "party_a_email", label: "Party A email", type: "email", required: true },
      { key: "party_b_name", label: "Party B legal name", type: "text", required: true },
      { key: "party_b_email", label: "Party B email", type: "email", required: true },
      { key: "effective_date", label: "Effective date", type: "date", required: true },
      { key: "term_months", label: "Confidentiality term (months)", type: "number", required: true },
      { key: "purpose", label: "Purpose of disclosure", type: "textarea", required: true },
    ],
    signerRoles: [
      { key: "party_a", label: "Party A", description: "First disclosing / receiving party" },
      { key: "party_b", label: "Party B", description: "Second disclosing / receiving party" },
    ],
    faq: [
      {
        question: "When should I use a mutual NDA instead of a one-way NDA?",
        answer:
          "Use mutual when both sides will share confidential information. Use one-way when only one party discloses.",
      },
      {
        question: "Does signing here create a lawyer-reviewed contract?",
        answer:
          "No. This is a standard template for simple electronic signature. Have counsel review if the deal is high risk or complex.",
      },
      {
        question: "Can I edit the clause language?",
        answer:
          "v1 supports filling fields and branding. Deep clause editing and AI drafting are out of scope.",
      },
      {
        question: "How long is the NDA effective?",
        answer:
          "You set the term in months when composing. The PDF records the effective date and term you choose.",
      },
    ],
  },
  {
    slug: "one-way-nda",
    name: "One-way NDA",
    shortDescription: "Protect information you share when the other party is only receiving.",
    longDescription: `A one-way (unilateral) NDA protects the disclosing party when the recipient primarily listens—for example investor decks, vendor RFPs, or candidate take-home briefs.

The template names the discloser and recipient, defines confidential information, and sets return or destruction duties when the relationship ends.

Always confirm the document is eligible for simple e-signature where you operate.`,
    category: "nda",
    whoUsesIt: ["Founders", "HR teams", "Agencies", "Consultants"],
    fields: [
      { key: "discloser_name", label: "Disclosing party name", type: "text", required: true },
      { key: "discloser_email", label: "Disclosing party email", type: "email", required: true },
      { key: "recipient_name", label: "Recipient name", type: "text", required: true },
      { key: "recipient_email", label: "Recipient email", type: "email", required: true },
      { key: "effective_date", label: "Effective date", type: "date", required: true },
      { key: "purpose", label: "Purpose of disclosure", type: "textarea", required: true },
    ],
    signerRoles: [
      { key: "discloser", label: "Discloser", description: "Party sharing confidential information" },
      { key: "recipient", label: "Recipient", description: "Party receiving confidential information" },
    ],
    faq: [
      {
        question: "Who signs a one-way NDA?",
        answer: "Typically both discloser and recipient sign so the obligation is clear and enforceable.",
      },
      {
        question: "Is this suitable for employee NDAs?",
        answer:
          "It can work for light contractor disclosures. Employment agreements may need local employment counsel.",
      },
      {
        question: "What if I need mutual obligations?",
        answer: "Switch to the Mutual NDA template instead of editing this one into a hybrid.",
      },
    ],
  },
  {
    slug: "independent-contractor-agreement",
    name: "Independent Contractor Agreement",
    shortDescription: "Engage a contractor with scope, fees, IP, and confidentiality in one packet.",
    longDescription: `Use this when hiring an independent contractor—not an employee—for a defined project or retainer. It captures parties, scope, payment terms, ownership of work product, and confidentiality.

Agencies and small businesses use it to avoid informal email-only deals. It does not create an employment relationship and is not tax or immigration advice.

Blocked document types (wills, court papers, family-law instruments, notarized deeds) must not be uploaded as substitutes for this template.`,
    category: "contractor",
    whoUsesIt: ["Agency owners", "Startups", "Freelancers hiring help"],
    fields: [
      { key: "client_name", label: "Client legal name", type: "text", required: true },
      { key: "client_email", label: "Client email", type: "email", required: true },
      { key: "contractor_name", label: "Contractor legal name", type: "text", required: true },
      { key: "contractor_email", label: "Contractor email", type: "email", required: true },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "scope", label: "Scope of work", type: "textarea", required: true },
      { key: "fee_terms", label: "Fee and payment terms", type: "textarea", required: true },
    ],
    signerRoles: [
      { key: "client", label: "Client", description: "Company engaging the contractor" },
      { key: "contractor", label: "Contractor", description: "Independent service provider" },
    ],
    faq: [
      {
        question: "Does this make someone an employee?",
        answer:
          "No. Classification depends on local law and how you work day to day. This template assumes independent-contractor status.",
      },
      {
        question: "Can I attach a statement of work?",
        answer: "Put the scope in the scope field for v1, or use Upload PDF for a custom SOW later.",
      },
      {
        question: "Who owns the IP?",
        answer:
          "The template is designed for client ownership of deliverables unless you negotiate otherwise offline.",
      },
      {
        question: "How many signers can I add on Free?",
        answer: "Free allows up to two signers per document. Upgrade or use credits for more complex packets.",
      },
    ],
  },
  {
    slug: "freelance-service-agreement",
    name: "Freelance / Service Agreement",
    shortDescription: "Client and freelancer agree on deliverables, timeline, and payment.",
    longDescription: `A lightweight services agreement for freelancers and solo consultants. Capture project description, milestones or flat fee, revision policy, and how either side can end the engagement.

Ideal when you want something more formal than a quote email, without enterprise MSA length.

Simple e-signature only—not a substitute for regulated professional retainers where the law requires wet ink.`,
    category: "contractor",
    whoUsesIt: ["Freelancers", "Consultants", "Small agencies"],
    fields: [
      { key: "client_name", label: "Client name", type: "text", required: true },
      { key: "client_email", label: "Client email", type: "email", required: true },
      { key: "provider_name", label: "Service provider name", type: "text", required: true },
      { key: "provider_email", label: "Service provider email", type: "email", required: true },
      { key: "project_title", label: "Project title", type: "text", required: true },
      { key: "deliverables", label: "Deliverables", type: "textarea", required: true },
      { key: "fee", label: "Total fee (USD)", type: "text", required: true },
      { key: "timeline", label: "Timeline", type: "textarea", required: true },
    ],
    signerRoles: [
      { key: "client", label: "Client", description: "Buyer of services" },
      { key: "provider", label: "Provider", description: "Freelancer or studio delivering work" },
    ],
    faq: [
      {
        question: "Is this the same as an ICA?",
        answer:
          "It is shorter and project-oriented. Use the Independent Contractor Agreement for longer retainers with heavier IP clauses.",
      },
      {
        question: "Can I bill in other currencies?",
        answer: "v1 product billing is USD only. You may still describe fees in the document text.",
      },
      {
        question: "What if the client needs sequential signing?",
        answer: "Choose sequential order when adding signers so the client signs after you, or vice versa.",
      },
    ],
  },
  {
    slug: "no-objection-certificate",
    name: "No Objection Certificate (NOC)",
    shortDescription: "Record that an organization has no objection to a stated request.",
    longDescription: `A No Objection Certificate states that the issuer does not object to a named request—travel, secondary employment, release of records, or similar administrative purposes.

Fill issuer and subject details, the subject of no objection, and the validity window. This is not a visa, court order, or notarized deed.

Do not use Sign for court, adoption, divorce, or testamentary documents.`,
    category: "certificate",
    whoUsesIt: ["HR managers", "Employers", "Schools", "Administrators"],
    fields: [
      { key: "issuer_name", label: "Issuing organization", type: "text", required: true },
      { key: "issuer_email", label: "Issuer contact email", type: "email", required: true },
      { key: "subject_name", label: "Subject full name", type: "text", required: true },
      { key: "subject_email", label: "Subject email", type: "email", required: false },
      { key: "purpose", label: "No-objection purpose", type: "textarea", required: true },
      { key: "valid_until", label: "Valid until", type: "date", required: false },
    ],
    signerRoles: [
      { key: "issuer", label: "Authorized issuer", description: "Person signing for the organization" },
      { key: "acknowledgement", label: "Subject (optional)", description: "Optional acknowledgement by the subject" },
    ],
    faq: [
      {
        question: "Will embassies accept this NOC?",
        answer:
          "Requirements vary. Some authorities require wet ink or notarization—those are blocked / out of scope for Sign.",
      },
      {
        question: "Who must sign?",
        answer: "At minimum an authorized issuer. Add the subject as a second signer if you need acknowledgement.",
      },
      {
        question: "Can I upload a government NOC form instead?",
        answer: "Use Upload your own PDF when that feature ships; do not put blocked document types through Sign.",
      },
    ],
  },
  {
    slug: "offer-letter",
    name: "Offer Letter",
    shortDescription: "Extend a job offer with role, start date, and compensation summary.",
    longDescription: `An offer letter summarizes the role you are offering: title, start date, compensation, and reporting line. Candidates accept electronically without creating a KarmaKoders account.

It is not a full employment contract, equity plan, or immigration filing. Local employment law may require additional paperwork.

Never use this flow for family-law, court, or testamentary documents.`,
    category: "hr",
    whoUsesIt: ["HR managers", "Founders", "Recruiters"],
    fields: [
      { key: "company_name", label: "Company name", type: "text", required: true },
      { key: "company_email", label: "Company contact email", type: "email", required: true },
      { key: "candidate_name", label: "Candidate name", type: "text", required: true },
      { key: "candidate_email", label: "Candidate email", type: "email", required: true },
      { key: "job_title", label: "Job title", type: "text", required: true },
      { key: "start_date", label: "Proposed start date", type: "date", required: true },
      { key: "compensation", label: "Compensation summary", type: "textarea", required: true },
    ],
    signerRoles: [
      { key: "employer", label: "Employer", description: "Hiring company authorized signer" },
      { key: "candidate", label: "Candidate", description: "Person accepting the offer" },
    ],
    faq: [
      {
        question: "Is an accepted offer a binding employment contract?",
        answer:
          "It depends on jurisdiction and wording. Many employers follow with a full agreement; ask counsel if unsure.",
      },
      {
        question: "Can the candidate decline?",
        answer: "Yes. Signers can decline with a reason; you will see it on the document status page.",
      },
      {
        question: "Do candidates need an account?",
        answer: "No. They open the email link, confirm OTP, and sign on their phone or desktop.",
      },
      {
        question: "What about equity exhibits?",
        answer: "Summarize in compensation text for v1, or attach via Upload PDF when available.",
      },
    ],
  },
  {
    slug: "consent-release-form",
    name: "Consent / Release Form",
    shortDescription: "Collect consent or a limited release for a stated activity or use of materials.",
    longDescription: `Use this for photo/video release, event participation consent, or similar acknowledgements where a person grants permission and understands basic risks.

It is not a medical consent form under specialized health regulations, not a court waiver of rights where prohibited, and not a substitute for notarized instruments.

Present clear purpose text so signers know what they are agreeing to.`,
    category: "consent",
    whoUsesIt: ["Event organizers", "Marketers", "Studios", "HR"],
    fields: [
      { key: "organization_name", label: "Organization name", type: "text", required: true },
      { key: "organization_email", label: "Organization email", type: "email", required: true },
      { key: "participant_name", label: "Participant name", type: "text", required: true },
      { key: "participant_email", label: "Participant email", type: "email", required: true },
      { key: "consent_purpose", label: "Consent / release purpose", type: "textarea", required: true },
      { key: "event_date", label: "Event or effective date", type: "date", required: false },
    ],
    signerRoles: [
      { key: "organization", label: "Organization", description: "Party requesting consent" },
      { key: "participant", label: "Participant", description: "Person giving consent or release" },
    ],
    faq: [
      {
        question: "Can minors sign?",
        answer:
          "v1 assumes adult signers with capacity. Guardian workflows for minors are out of scope.",
      },
      {
        question: "Is this a HIPAA or clinical consent?",
        answer: "No. Do not use Sign for regulated clinical or court-mandated consents.",
      },
      {
        question: "Can I revoke consent later?",
        answer:
          "Revocation depends on the text and law. Void stops further signatures; completed PDFs remain in the audit trail unless deleted per policy.",
      },
    ],
  },
  {
    slug: "acknowledgment-receipt",
    name: "Acknowledgment / Receipt",
    shortDescription: "Confirm that someone received funds, property, or information on a given date.",
    longDescription: `An acknowledgment or receipt records that a party received something—payment, equipment, documents, or notice—on a stated date. Useful for handoffs and simple proof of delivery.

It is not a bank statement, notarial certificate, or court filing. Keep amounts and descriptions accurate.

Blocked types such as wills and notarized deeds must not be processed through Sign.`,
    category: "consent",
    whoUsesIt: ["Operations", "Finance admins", "Freelancers", "HR"],
    fields: [
      { key: "issuer_name", label: "Issuer name", type: "text", required: true },
      { key: "issuer_email", label: "Issuer email", type: "email", required: true },
      { key: "recipient_name", label: "Recipient name", type: "text", required: true },
      { key: "recipient_email", label: "Recipient email", type: "email", required: true },
      { key: "received_item", label: "What was received", type: "textarea", required: true },
      { key: "amount", label: "Amount (if any)", type: "text", required: false },
      { key: "received_on", label: "Date received", type: "date", required: true },
    ],
    signerRoles: [
      { key: "issuer", label: "Issuer", description: "Party confirming the handoff" },
      { key: "recipient", label: "Recipient", description: "Party acknowledging receipt" },
    ],
    faq: [
      {
        question: "Is this a tax invoice?",
        answer: "No. Issue invoices from your accounting tool; use this for acknowledgement of receipt only.",
      },
      {
        question: "Do both parties need to sign?",
        answer: "Recommended. You can send with one signer if only acknowledgement from the recipient is needed.",
      },
      {
        question: "Can I verify the PDF later?",
        answer: "Yes. Completed documents get a public verification page and SHA-256 hash on the certificate.",
      },
    ],
  },
];

export function getTemplateBySlug(slug: string): SignTemplateMeta | undefined {
  return SIGN_TEMPLATES.find((t) => t.slug === slug);
}

export function listTemplateSlugs(): string[] {
  return SIGN_TEMPLATES.map((t) => t.slug);
}

/** Category labels for UI badges. */
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  nda: "NDA",
  contractor: "Contractor",
  hr: "HR",
  consent: "Consent",
  certificate: "Certificate",
};

/**
 * Whole-word keywords that indicate a blocked document type (PRD §7).
 * Matched against a template's slug, name and category — never against FAQ copy,
 * which legitimately mentions blocked types to warn users.
 */
export const BLOCKED_TYPE_KEYWORDS = [
  "will",
  "wills",
  "codicil",
  "testament",
  "testamentary",
  "court",
  "adoption",
  "divorce",
  "custody",
  "notary",
  "notarized",
  "notarised",
  "deed",
  "deeds",
  "wet ink",
  "wet-ink",
] as const;

/** Returns the blocked keywords found in `text` (case-insensitive, whole words; hyphens split words). */
export function findBlockedTypeKeywords(text: string): string[] {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return BLOCKED_TYPE_KEYWORDS.filter((keyword) =>
    normalized.includes(` ${keyword.replace(/[^a-z0-9]+/g, " ")} `)
  );
}

/** 2–3 related templates: same category first, then others, in catalog order. */
export function getRelatedTemplates(slug: string, max = 3): SignTemplateMeta[] {
  const current = getTemplateBySlug(slug);
  if (!current) return [];
  const others = SIGN_TEMPLATES.filter((t) => t.slug !== slug);
  const sameCategory = others.filter((t) => t.category === current.category);
  const rest = others.filter((t) => t.category !== current.category);
  return [...sameCategory, ...rest].slice(0, max);
}
