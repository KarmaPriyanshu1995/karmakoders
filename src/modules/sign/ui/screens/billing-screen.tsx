import type { ReactNode } from "react";
import { Coins, CreditCard, Receipt } from "lucide-react";
import { BillingIntervalToggle } from "../pricing/billing-interval-toggle";
import { PlanCard } from "../pricing/plan-card";
import { Button } from "../button";
import { Card } from "../card";
import { formatCredits, ProgressMeter } from "../display";
import { EmptyState } from "../feedback";
import { ToneBadge } from "../status-badge";
import type { BillingVM } from "../view-models";
import { formatDate } from "./format";
import { PageHeader, SectionHeading } from "./parts";

/** Disabled checkout button with a visible reason. TODO(Step 10): Paddle checkout. */
function PlaceholderButton({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Button variant={variant} className="w-full" disabled aria-describedby="billing-coming-soon">
      {children}
    </Button>
  );
}

function Price({ amount, suffix }: { amount: string; suffix: string }) {
  return (
    <p>
      <span className="text-4xl font-black text-white">{amount}</span> <span className="text-sm text-[#A39F97]">{suffix}</span>
    </p>
  );
}

export function BillingScreen({ vm }: { vm: BillingVM }) {
  const { plan } = vm;
  return (
    <div className="space-y-10">
      <PageHeader
        title="Billing"
        description="Credits never expire and work across KarmaKoders tools. Prices are in USD."
        actions={
          <Button variant="secondary" icon={<CreditCard />} disabled aria-describedby="billing-coming-soon">
            Manage billing
          </Button>
        }
      />
      <p id="billing-coming-soon" className="rounded-xl border border-white/10 bg-[#1C1B1A] p-4 text-sm text-[#A39F97]">
        Buying credits and plans opens soon. Payments are handled by Paddle, our merchant of record.
      </p>

      <section aria-label="Your balance and plan" className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#A39F97]">
            <Coins aria-hidden className="size-4 text-[#FFC300]" />
            Credit balance
          </p>
          <p className="text-3xl font-black text-white">{formatCredits(plan.creditsBalance)}</p>
          <p className="text-sm text-[#A39F97]">1 credit sends 1 document with up to 10 signers and no KarmaKoders footer.</p>
        </Card>
        <Card className="space-y-3 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">Current plan</p>
          <p className="text-3xl font-black text-white">{plan.planName}</p>
          {plan.renewsAt ? (
            <p className="text-sm text-[#A39F97]">Renews on {formatDate(plan.renewsAt)}</p>
          ) : (
            <ProgressMeter
              label="Free documents this month"
              value={plan.freeUsed}
              max={plan.freeLimit}
              valueText={`${plan.freeUsed} of ${plan.freeLimit} used`}
            />
          )}
        </Card>
      </section>

      <section aria-labelledby="credits-heading" className="space-y-4">
        <SectionHeading id="credits-heading">Buy credits</SectionHeading>
        <ul className="grid gap-4 md:grid-cols-2">
          {vm.creditPacks.map((pack, index) => (
            <li key={pack.id}>
              <PlanCard
                name={pack.name}
                description={pack.description}
                badge={index === vm.creditPacks.length - 1 ? "Best value" : undefined}
                price={<Price amount={pack.price} suffix={`for ${pack.credits} credits`} />}
                features={pack.features}
                cta={<PlaceholderButton>Buy {pack.credits} credits</PlaceholderButton>}
              />
            </li>
          ))}
        </ul>
      </section>

      <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-24 space-y-4">
        <SectionHeading id="plans-heading">Plans</SectionHeading>
        <BillingIntervalToggle>
          <ul className="grid gap-4 md:grid-cols-2">
            {vm.subscriptions.map((sub, index) => (
              <li key={sub.product}>
                <PlanCard
                  name={sub.name}
                  description={sub.description}
                  highlighted={index === 0}
                  badge={sub.current ? "Current plan" : index === 0 ? "Popular" : undefined}
                  price={
                    <>
                      <div className="group-data-[interval=year]:hidden">
                        <Price amount={sub.monthly.price} suffix="per month" />
                      </div>
                      <div className="hidden group-data-[interval=year]:block">
                        <Price amount={sub.yearly.price} suffix="per year" />
                        {sub.yearly.savingsMonths > 0 ? (
                          <p className="text-xs font-semibold text-[#FFC300]">{sub.yearly.savingsMonths} months free</p>
                        ) : null}
                      </div>
                    </>
                  }
                  features={sub.features}
                  cta={
                    sub.current ? (
                      <ToneBadge tone="success" className="w-fit">
                        Your current plan
                      </ToneBadge>
                    ) : (
                      <PlaceholderButton variant={index === 0 ? "primary" : "secondary"}>Upgrade to {sub.name}</PlaceholderButton>
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </BillingIntervalToggle>
      </section>

      <section aria-labelledby="purchases-heading" className="space-y-4">
        <SectionHeading id="purchases-heading">Recent purchases</SectionHeading>
        {vm.purchases.length === 0 ? (
          <EmptyState icon={Receipt} title="No purchases yet" description="Credit packs and plan payments will be listed here with their receipts." />
        ) : (
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
            {vm.purchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold text-white">{p.description}</span>
                  <span className="text-[#A39F97]">{formatDate(p.at)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold text-white">{p.amount}</span>
                  <ToneBadge tone={p.status === "paid" ? "success" : "neutral"}>{p.status === "paid" ? "Paid" : "Refunded"}</ToneBadge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
