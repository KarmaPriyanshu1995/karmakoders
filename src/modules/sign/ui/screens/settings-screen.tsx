import { LogOut, Monitor } from "lucide-react";
import { Button } from "../button";
import { Card } from "../card";
import { ToneBadge } from "../status-badge";
import type { SettingsVM } from "../view-models";
import { BrandingForm } from "./branding-form";
import { formatDateTime } from "./format";
import { PageHeader, SectionHeading } from "./parts";

function ReadOnlyRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-[#A39F97]">{label}</dt>
      <dd className="min-w-0">
        <span className="block break-all text-white">{value}</span>
        {note ? <span className="text-sm text-[#A39F97]">{note}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Profile, branding and security. "Log out of all devices" uses the existing Server Action,
 * passed in by the page so this screen never imports page code.
 */
export function SettingsScreen({ vm, logoutAllAction }: { vm: SettingsVM; logoutAllAction: () => Promise<void> }) {
  return (
    <div className="space-y-12">
      <PageHeader title="Settings" />

      <section aria-labelledby="profile-heading" className="space-y-4">
        <SectionHeading id="profile-heading">Profile</SectionHeading>
        <Card className="px-5">
          <dl className="divide-y divide-white/10">
            {/* TODO(Step 7): make the name editable. */}
            <ReadOnlyRow label="Name" value={vm.profile.name ?? "Not set"} note="You'll be able to edit your name soon." />
            <ReadOnlyRow label="Email" value={vm.profile.email} note="Your sign-in email can't be changed here." />
            <ReadOnlyRow label="Plan" value={vm.plan.planName} />
          </dl>
        </Card>
      </section>

      <section aria-labelledby="branding-heading" className="space-y-4">
        <SectionHeading id="branding-heading">Branding</SectionHeading>
        <Card className="p-5">
          <BrandingForm />
        </Card>
      </section>

      <section aria-labelledby="security-heading" className="space-y-4">
        <SectionHeading id="security-heading">Security</SectionHeading>
        <Card className="space-y-4 p-5">
          <h3 className="text-lg font-semibold text-white">Signed-in devices</h3>
          <ul className="divide-y divide-white/10">
            {vm.sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-3">
                  <Monitor aria-hidden className="size-5 text-[#A39F97]" />
                  <span>
                    <span className="block font-semibold text-white">{session.device}</span>
                    <span className="text-sm text-[#A39F97]">Last active {formatDateTime(session.lastActiveAt)}</span>
                  </span>
                </span>
                {session.current ? <ToneBadge tone="success">This device</ToneBadge> : null}
              </li>
            ))}
          </ul>
          <form action={logoutAllAction} className="space-y-2 border-t border-white/10 pt-4">
            <p className="text-sm text-[#A39F97]">Signs you out everywhere, including this device. You&apos;ll need a new email code to sign in.</p>
            <Button type="submit" variant="secondary" icon={<LogOut />}>
              Log out of all devices
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
