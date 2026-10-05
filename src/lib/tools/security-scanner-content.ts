export const SECURITY_SCANNER_CONTENT = {
  heroHeading: "Free App Security Scanner",
  heroSubheading:
    "A plain-English security check for apps built with Lovable, Bolt, v0, Cursor, or Replit.",
  h2: "What you get",
  introAbove:
    "Paste your URL to open the KarmaKoders scanner. Find missing headers, exposed files, weak TLS, open CORS, and more — with redacted evidence and optional AI fix prompts.",
  introBelow:
    "Connect GitHub for authorized repository scans, verify domain ownership for deeper checks, schedule re-scans, and click Verify Fix after you remediate.",
  faq: [
    {
      question: "Is this a penetration test?",
      answer:
        "No. It is an automated security posture check with evidence. It is not a guarantee of security and does not replace a professional audit.",
    },
    {
      question: "Do I need an account?",
      answer:
        "Passive URL checks can start without signup. Ownership verification and private GitHub repos require authorization.",
    },
    {
      question: "Where does scanning run?",
      answer:
        "The public page is the entry point. The scanner application and Python worker run separately and keep your scan jobs queued safely.",
    },
  ],
};
