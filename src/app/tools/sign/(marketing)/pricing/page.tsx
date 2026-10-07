import { generateFaqSchema } from "@/lib/seo/schemaGenerator";
import { isSignAppEnabled } from "@/platform/env/flags";
import {
  CREDIT_PRO_FEATURES_LINE,
  PLANS,
  SUBSCRIPTION_PAIRS,
  formatUsd,
  yearlySavingsMonths,
  type PlanId,
} from "@/platform/billing/plans";
import { getPlanCta } from "@/modules/sign/launch";
import { BILLING_FAQ, PADDLE_MOR_STATEMENT, PRICES_IN_USD_NOTE } from "@/modules/sign/content/pricing";
import { JsonLd, signPageMetadata, softwareApplicationJsonLd } from "@/modules/sign/seo";
import { BillingIntervalToggle, ComparisonTable, FaqList, PlanCard, PlanCta } from "@/modules/sign/ui";

export const metadata = signPageMetadata({
  title: "Pricing — KarmaKoders Sign",
  description:
    "Send 3 documents a month free, buy credits that never expire, or subscribe to Sign Pro or All Access. USD pricing, no per-seat fees.",
  path: "/tools/sign/pricing",
});

function Price({ amount, suffix }: { amount: string; suffix: string }) {
  return (
    <p>
      <span className="text-4xl font-black text-white">{amount}</span>
      <span className="ml-1 text-sm text-[#A39F97]">{suffix}</span>
    </p>
  );
}

export default function SignPricingPage() {
  const appEnabled = isSignAppEnabled();
  const cta = (planId: PlanId, highlighted = false) => (
    <PlanCta action={getPlanCta(planId, appEnabled)} highlighted={highlighted} />
  );

  const free = PLANS.free;
  const credits = [PLANS.credits_10, PLANS.credits_30];

  return (
    <div className="space-y-20">
      <JsonLd data={[softwareApplicationJsonLd(), generateFaqSchema({ questions: [...BILLING_FAQ] })]} />

      <header className="space-y-4">
        <p className="text-sm font-bold uppercase tracking-widest text-[#FFC300]">Pricing</p>
        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
          Simple pricing. No per-seat fees.
        </h1>
        <p className="max-w-2xl leading-relaxed text-[#A39F97]">
          Start free, pay only when you send more, or subscribe for unlimited sending.
        </p>
      </header>

      <section aria-labelledby="plans-heading" className="space-y-6">
        <h2 id="plans-heading" className="sr-only">
          Plans
        </h2>
        <BillingIntervalToggle>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <li>
              <PlanCard
                name={free.displayName}
                description={free.description}
                price={<Price amount={formatUsd(free.amountCents)} suffix="forever" />}
                features={free.features}
                cta={cta("free")}
              />
            </li>
            <li>
              <PlanCard
                name="Credits"
                description="One-time packs. Credits never expire and work across KarmaKoders tools."
                price={
                  <div className="space-y-1">
                    {credits.map((pack) => (
                      <Price
                        key={pack.id}
                        amount={formatUsd(pack.amountCents)}
                        suffix={`for ${pack.creditsGranted} credits`}
                      />
                    ))}
                  </div>
                }
                features={[
                  "1 credit = 1 sent Sign document",
                  CREDIT_PRO_FEATURES_LINE,
                  ...PLANS.credits_10.features.slice(1),
                ]}
                cta={
                  <div className="space-y-2">
                    {credits.map((pack) => (
                      <PlanCta
                        key={pack.id}
                        action={{
                          ...getPlanCta(pack.id, appEnabled),
                          label: appEnabled ? `Get ${pack.creditsGranted} credits` : "Get early access",
                        }}
                      />
                    ))}
                  </div>
                }
              />
            </li>
            {SUBSCRIPTION_PAIRS.map((pair, index) => {
              const monthly = PLANS[pair.month];
              const yearly = PLANS[pair.year];
              const savings = yearlySavingsMonths(monthly, yearly);
              return (
                <li key={pair.product}>
                  <PlanCard
                    name={monthly.displayName}
                    description={monthly.description}
                    highlighted={index === 0}
                    badge={index === 0 ? "Popular" : undefined}
                    price={
                      <>
                        <div className="group-data-[interval=year]:hidden">
                          <Price amount={formatUsd(monthly.amountCents)} suffix="per month" />
                        </div>
                        <div className="hidden group-data-[interval=year]:block">
                          <Price amount={formatUsd(yearly.amountCents)} suffix="per year" />
                          {savings > 0 ? (
                            <p className="text-xs font-semibold text-[#FFC300]">{savings} months free</p>
                          ) : null}
                        </div>
                      </>
                    }
                    features={monthly.features}
                    cta={
                      <>
                        <div className="group-data-[interval=year]:hidden">{cta(pair.month, index === 0)}</div>
                        <div className="hidden group-data-[interval=year]:block">{cta(pair.year, index === 0)}</div>
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </BillingIntervalToggle>
        <p className="text-sm text-[#A39F97]">{PRICES_IN_USD_NOTE}</p>
      </section>

      <section aria-labelledby="compare-heading" className="space-y-6">
        <h2 id="compare-heading" className="text-2xl font-bold text-white md:text-3xl">
          Compare plans
        </h2>
        <ComparisonTable />
      </section>

      <section aria-labelledby="billing-faq-heading" className="space-y-6">
        <h2 id="billing-faq-heading" className="text-2xl font-bold text-white md:text-3xl">
          Billing FAQ
        </h2>
        <FaqList items={BILLING_FAQ} idPrefix="billing-faq" />
      </section>

      <section aria-label="Merchant of Record" className="rounded-xl border border-white/10 bg-[#1C1B1A] p-6">
        <p className="text-sm leading-relaxed text-[#A39F97]">{PADDLE_MOR_STATEMENT}</p>
      </section>
    </div>
  );
}
