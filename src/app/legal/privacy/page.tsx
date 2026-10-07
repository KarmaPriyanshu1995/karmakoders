import { LEGAL_OPERATOR, PROCESSORS } from "@/modules/sign/content/legal";
import { signPageMetadata } from "@/modules/sign/seo";
import { LegalPage } from "@/modules/sign/ui/legal-page";

export const metadata = signPageMetadata({
  title: "Privacy Policy — KarmaKoders Sign",
  description: "What personal data KarmaKoders Sign collects, why, who processes it, how long we keep it and your rights.",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains how {LEGAL_OPERATOR.name} (&quot;we&quot;) handles personal data when you use KarmaKoders
          Sign, as a sender or as a signer. We act as the controller for account and billing data, and process document
          contents on behalf of the sender.
        </p>
      }
    >
      <section>
        <h2>Data we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> your email address and, if you provide them, your name and branding (company
            name, logo).
          </li>
          <li>
            <strong>Documents and signer details:</strong> the documents you create or upload, field values, and each
            signer&apos;s name and email address.
          </li>
          <li>
            <strong>Audit trail data:</strong> for each signer, IP address, browser user agent and timestamps of views,
            one-time-code verification, consent, signatures and declines.
          </li>
          <li>
            <strong>Billing data:</strong> plan, credits and transaction references. Card details are handled by Paddle and
            never reach us.
          </li>
        </ul>
      </section>

      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To provide the Service: sign-in, sending documents, collecting signatures and delivering final PDFs.</li>
          <li>To create a tamper-evident audit trail and certificate that can prove how a document was signed.</li>
          <li>To process payments, prevent fraud and abuse, and keep the Service secure (for example rate limiting).</li>
          <li>To send service emails such as one-time codes, signing requests, reminders and completion notices.</li>
        </ul>
        <p>
          Our legal bases are performance of a contract, our legitimate interests in operating a secure and reliable
          service, and compliance with legal obligations.
        </p>
      </section>

      <section>
        <h2>Processors</h2>
        <p>We use these service providers to run KarmaKoders Sign:</p>
        <ul>
          {PROCESSORS.map((processor) => (
            <li key={processor.name}>
              <strong>{processor.name}</strong>: {processor.purpose}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Retention</h2>
        <p>
          Signed documents, their audit trail and certificate are kept for <strong>7 years</strong> unless the document
          owner deletes them earlier. One-time codes and expired sessions are deleted regularly. Billing records are kept as
          long as tax law requires.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Under the GDPR and UK GDPR you may request access to, correction of, deletion of, restriction of or a copy of your
          personal data, object to processing, and complain to your data protection authority. If you are a California
          resident, the CCPA gives you the right to know, delete and correct personal information and not to be
          discriminated against for exercising these rights. We do not sell or share personal information for
          cross-context behavioural advertising.
        </p>
        <p>
          Signers&apos; data inside a document is controlled by the sender; we will forward signer requests to the sender
          where appropriate.
        </p>
      </section>

      <section>
        <h2>International transfers</h2>
        <p>
          We and our processors may process data outside your country, including in India, the United States and the
          European Union. Where required, transfers are protected by appropriate safeguards such as standard contractual
          clauses.
        </p>
      </section>

      <section>
        <h2>Contact and requests</h2>
        <p>
          Send privacy requests to{" "}
          <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-[#FFC300] underline underline-offset-4">
            {LEGAL_OPERATOR.email}
          </a>
          . We reply within {LEGAL_OPERATOR.responseTime} and complete requests within the time the law requires.
        </p>
      </section>
    </LegalPage>
  );
}
