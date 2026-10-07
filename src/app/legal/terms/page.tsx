import Link from "next/link";
import { BLOCKED_DOCUMENT_TYPES } from "@/modules/sign/templates";
import { LEGAL_OPERATOR } from "@/modules/sign/content/legal";
import { PADDLE_MOR_STATEMENT } from "@/modules/sign/content/pricing";
import { signPageMetadata } from "@/modules/sign/seo";
import { LegalPage } from "@/modules/sign/ui/legal-page";

export const metadata = signPageMetadata({
  title: "Terms of Service — KarmaKoders Sign",
  description: "The terms that apply when you use KarmaKoders Sign to create, send and e-sign documents.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms govern your use of KarmaKoders Sign (the &quot;Service&quot;), provided by {LEGAL_OPERATOR.name}. By
          creating an account, sending a document or signing a document, you agree to these terms.
        </p>
      }
    >
      <section>
        <h2>1. The Service</h2>
        <p>
          KarmaKoders Sign lets senders create documents from templates or uploaded PDFs, send them to signers, and collect
          simple electronic signatures with an audit trail. Signers do not need an account.
        </p>
        <p>
          The Service provides <strong>simple electronic signatures</strong>. It does not provide qualified or advanced
          electronic signatures, notarisation or witnessing. {LEGAL_OPERATOR.name} is not a law firm and does not give
          legal advice. Templates are provided for convenience; you are responsible for confirming that a document and an
          electronic signature are appropriate in your jurisdiction.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          Senders sign in with a one-time code sent to their email address. You are responsible for keeping access to that
          email account secure and for all activity under your account.
        </p>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>
          You must follow our <Link href="/legal/acceptable-use">Acceptable Use Policy</Link>. You may not use the Service
          for the following document types:
        </p>
        <ul>
          {BLOCKED_DOCUMENT_TYPES.map((type) => (
            <li key={type}>{type}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>4. Plans, credits and payments</h2>
        <p>
          The Service offers a free tier, one-time credit packs and subscriptions as described on the{" "}
          <Link href="/tools/sign/pricing">pricing page</Link>. Prices are in USD; taxes may apply depending on your
          location. One credit sends one document. Credits never expire and can be used across KarmaKoders tools.
        </p>
        <p>
          <strong>{PADDLE_MOR_STATEMENT}</strong>
        </p>
        <p>
          Subscriptions renew automatically until cancelled. You can cancel anytime; your plan stays active until the end
          of the period you have paid for. Refunds are described in our <Link href="/legal/refund-policy">Refund Policy</Link>.
        </p>
      </section>

      <section>
        <h2>5. Electronic records and signatures</h2>
        <p>
          By using the Service you agree to receive records and sign documents electronically, as described in our{" "}
          <Link href="/legal/esign-disclosure">E-Sign Disclosure</Link>.
        </p>
      </section>

      <section>
        <h2>6. Your content and privacy</h2>
        <p>
          You keep ownership of the documents you upload or create. You grant us the limited rights needed to store,
          process and deliver them to the signers you choose. We handle personal data as described in our{" "}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>7. Availability and changes</h2>
        <p>
          We work to keep the Service available but do not guarantee uninterrupted access. We may change or discontinue
          features and will give reasonable notice of material changes to these terms.
        </p>
      </section>

      <section>
        <h2>8. Liability</h2>
        <p>
          To the extent permitted by law, the Service is provided &quot;as is&quot;, and {LEGAL_OPERATOR.name}&apos;s total
          liability for any claim relating to the Service is limited to the amount you paid us in the 12 months before the
          claim. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>9. Termination</h2>
        <p>
          You can stop using the Service at any time. We may suspend accounts that breach these terms or the Acceptable Use
          Policy. Completed documents are retained as described in the Privacy Policy.
        </p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of India, without prejudice to mandatory consumer protections in your
          country of residence. Courts in {LEGAL_OPERATOR.city}, {LEGAL_OPERATOR.region} have jurisdiction, subject to
          those protections.
        </p>
      </section>
    </LegalPage>
  );
}
