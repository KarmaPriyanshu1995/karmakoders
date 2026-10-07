import Link from "next/link";
import { LEGAL_OPERATOR } from "@/modules/sign/content/legal";
import { signPageMetadata } from "@/modules/sign/seo";
import { LegalPage } from "@/modules/sign/ui/legal-page";

export const metadata = signPageMetadata({
  title: "Refund Policy — KarmaKoders Sign",
  description: "Refunds for KarmaKoders Sign credit packs and subscriptions, processed by Paddle.",
  path: "/legal/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>This policy applies to purchases of KarmaKoders Sign credit packs and subscriptions.</p>}
    >
      <section>
        <h2>14-day refunds</h2>
        <ul>
          <li>
            <strong>Credit packs:</strong> you can get a full refund within 14 days of purchase if none of the credits in
            the pack have been used.
          </li>
          <li>
            <strong>Subscriptions:</strong> you can get a full refund of the first payment of a new subscription within 14
            days of purchase.
          </li>
        </ul>
      </section>

      <section>
        <h2>Used credits</h2>
        <p>Credits that have been used to send a document are non-refundable.</p>
      </section>

      <section>
        <h2>Cancelling a subscription</h2>
        <p>
          You can cancel a subscription anytime. It stays active until the end of the period you have already paid for, and
          you won&apos;t be charged again. Renewal payments after the first are not refundable except where the law
          requires.
        </p>
      </section>

      <section>
        <h2>How refunds are processed</h2>
        <p>
          Payments and refunds are processed by Paddle.com, our Merchant of Record. To request a refund, reply to your Paddle
          receipt or email{" "}
          <a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-[#FFC300] underline underline-offset-4">
            {LEGAL_OPERATOR.email}
          </a>{" "}
          with your order details. Refunds go back to the original payment method. See also our{" "}
          <Link href="/legal/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
