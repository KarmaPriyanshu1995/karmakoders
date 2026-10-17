"use client";

import Link from "next/link";
import { ChevronDown, CreditCard, FileStack, LayoutDashboard, LayoutTemplate, LogOut, MonitorSmartphone, Settings } from "lucide-react";
import { Avatar, formatCredits } from "./display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { WORKSPACE_LINKS } from "./workspace-links";

const LINK_ICONS = {
  "/tools/sign/documents": FileStack,
  "/tools/sign/new": LayoutTemplate,
  "/tools/sign/billing": CreditCard,
  "/tools/sign/settings": Settings,
} as const;

/**
 * Account menu for the logged-in app header. The log-out Server Actions are passed in by the
 * (workspace) layout, so this component never imports page code.
 */
export function AccountMenu({
  email,
  credits,
  logoutAction,
  logoutAllAction,
}: {
  email: string;
  /** Shown in the menu on small screens, where the header hides the balance chip. */
  credits?: number;
  logoutAction: () => Promise<void>;
  logoutAllAction: () => Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1.5 text-[#A39F97] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] data-[state=open]:text-white motion-reduce:transition-none"
      >
        <Avatar name={email} />
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          Signed in as
          <span className="mt-0.5 block break-all text-sm font-semibold text-white">{email}</span>
          {credits !== undefined ? <span className="mt-1 block text-sm text-white sm:hidden">{formatCredits(credits)}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/tools/sign/dashboard">
            <LayoutDashboard aria-hidden />
            Dashboard
          </Link>
        </DropdownMenuItem>
        {WORKSPACE_LINKS.map(({ href, label }) => {
          const Icon = LINK_ICONS[href];
          return (
            <DropdownMenuItem key={href} asChild>
              <Link href={href}>
                <Icon aria-hidden />
                {label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit">
              <LogOut aria-hidden />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
        <form action={logoutAllAction}>
          <DropdownMenuItem asChild>
            <button type="submit">
              <MonitorSmartphone aria-hidden />
              Log out of all devices
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
