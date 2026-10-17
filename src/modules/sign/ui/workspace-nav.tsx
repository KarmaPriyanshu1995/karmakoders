"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { WORKSPACE_LINKS, isActiveSection } from "./workspace-links";

/** Compact header nav in the site Navbar style, shown from lg up (the account menu has the same links). */
export function WorkspaceNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sign" className="hidden items-center gap-1 lg:flex">
      {WORKSPACE_LINKS.map((link) => {
        const active = isActiveSection(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] motion-reduce:transition-none",
              active ? "text-[#FFC300]" : "text-[#A39F97] hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Always-visible primary action; icon-only below sm, with the same accessible name. */
export function NewDocumentButton() {
  return (
    <Button asChild size="sm" className="w-11 px-0 sm:w-auto sm:px-4">
      <Link href="/tools/sign/new" aria-label="New document">
        <Plus aria-hidden />
        <span aria-hidden className="hidden sm:inline">
          New document
        </span>
      </Link>
    </Button>
  );
}
