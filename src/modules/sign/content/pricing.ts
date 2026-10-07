/** Copy for /tools/sign/pricing (spec §2). Prices themselves come only from plans.ts. */

export const PRICES_IN_USD_NOTE = "Prices in USD. Taxes may apply depending on your location.";

export const PADDLE_MOR_STATEMENT =
  "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.";

export const BILLING_FAQ = [
  {
    question: "What is a credit?",
    answer: "One credit sends one document for signature. Preparing drafts is free; the credit is used only when you send.",
  },
  {
    question: "Do credits expire?",
    answer: "No. Credits never expire and work across all current and future KarmaKoders tools.",
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Yes, anytime. Your plan stays active until the end of the period you've already paid for.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Unused credit packs and the first payment of a new subscription can be refunded within 14 days of purchase. See the refund policy for details.",
    link: { href: "/legal/refund-policy", label: "Refund policy" },
  },
  {
    question: "Are taxes included?",
    answer: "Prices are in USD. Taxes such as VAT or GST are calculated at checkout based on your location.",
  },
  {
    question: "Who processes payments?",
    answer:
      "Payments are processed by Paddle.com, our Merchant of Record, which also handles invoices, taxes and returns.",
  },
] as const;
