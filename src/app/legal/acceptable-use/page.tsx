import { BLOCKED_DOCUMENT_TYPES } from "@/modules/sign/templates";
import { LEGAL_OPERATOR } from "@/modules/sign/content/legal";
import { signPageMetadata } from "@/modules/sign/seo";
import { LegalPage } from "@/modules/sign/ui/legal-page";

export const metadata = signPageMetadata({
  title: "Acceptable Use Policy — KarmaKoders Sign",
  description: "What you may not do with KarmaKoders Sign, including blocked document types.",
  path: "/legal/acceptable-use",
});

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      intro={<p>To keep KarmaKoders Sign safe and trustworthy for senders and signers, you may not use it to do the following.</p>}
    >
      <section>
        <h2>Prohibited uses</h2>
        <ul>
          <li>Create, send or sign documents that are illegal or that facilitate illegal activity.</li>
          <li>Commit fraud, including tricking someone into signing something different from what they were shown.</li>
          <li>Impersonate another person or organisation, or sign on someone&apos;s behalf without authority.</li>
          <li>Send spam, phishing or unsolicited signing requests.</li>
          <li>Upload malware, or try to probe, overload or bypass the security of the Service.</li>
        </ul>
      </section>

      <section>
        <h2>Blocked document types</h2>
        <p>These documents are not supported and must not be sent through KarmaKoders Sign:</p>
        <ul>
          {BLOCKED_DOCUMENT_TYPES.map((type) => (
            <li key={type}>{type}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Enforcement</h2>
        <p>
          We may suspend or close accounts, void documents in progress and report unlawful activity where the law requires.
          To report misuse, email{" "}
          <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-[#FFC300] underline underline-offset-4">
            {LEGAL_OPERATOR.email}
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
