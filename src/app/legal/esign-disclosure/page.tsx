import { LEGAL_OPERATOR } from "@/modules/sign/content/legal";
import { signPageMetadata } from "@/modules/sign/seo";
import { LegalPage } from "@/modules/sign/ui/legal-page";

export const metadata = signPageMetadata({
  title: "E-Sign Disclosure — KarmaKoders Sign",
  description: "Your consent to electronic records and signatures, paper copies, withdrawing consent and system requirements.",
  path: "/legal/esign-disclosure",
});

export default function EsignDisclosurePage() {
  return (
    <LegalPage
      title="Electronic Records and Signature Disclosure"
      intro={
        <p>
          Before you sign with KarmaKoders Sign, you are asked to agree to use electronic records and signatures. This
          disclosure explains what that means, as required by the US ESIGN Act and similar laws.
        </p>
      }
    >
      <section>
        <h2>Consent to electronic records</h2>
        <p>
          By ticking the consent box and signing, you agree that the documents, notices and disclosures for that
          transaction may be provided to you electronically, and that your electronic signature has the same effect as a
          handwritten signature for that document. Your consent applies to the specific document you are asked to sign.
        </p>
      </section>

      <section>
        <h2>Right to a paper copy</h2>
        <p>
          You can download the completed document and its audit certificate as a PDF and print it. You may also ask the
          sender for a paper copy. If you ask us, email{" "}
          <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-[#FFC300] underline underline-offset-4">
            {LEGAL_OPERATOR.email}
          </a>
          ; we do not charge for this.
        </p>
      </section>

      <section>
        <h2>Withdrawing consent</h2>
        <p>
          You can withdraw consent before you sign by declining the document on the signing page (you can give a reason)
          or by contacting the sender. Withdrawing consent does not affect documents you have already signed
          electronically.
        </p>
      </section>

      <section>
        <h2>Hardware and software requirements</h2>
        <ul>
          <li>A device with internet access and a current version of Chrome, Safari, Edge or Firefox (desktop or mobile).</li>
          <li>An email account you can access, to receive the signing link and one-time code.</li>
          <li>A PDF viewer to open the completed document, and storage space or a printer to keep a copy.</li>
        </ul>
      </section>

      <section>
        <h2>Updating your contact details</h2>
        <p>
          If your email address changes, tell the sender so they can send the document to the correct address.
        </p>
      </section>
    </LegalPage>
  );
}
