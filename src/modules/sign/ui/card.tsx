import * as React from "react";
import { Card as ProductCard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/product-ui";
import { cn } from "@/lib/utils";

/**
 * Sign Card. `interactive` cards (clickable list items) are the product-ui Card with its site
 * hover lift and glow. Static cards copy the same surface classes without the hover effects,
 * which would suggest a click target that is not there.
 */
export const CARD_SURFACE =
  "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-slate-100 shadow-[0_0_40px_rgba(255,195,0,0.03)]";

/** The site Navbar dropdown panel (MegaMenu) surface, shared by dialogs, menus, tooltips and toasts. */
export const PANEL_CLASSES = "rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-2xl";

export function Card({
  interactive = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  if (interactive) {
    return (
      <ProductCard
        className={cn("motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-within:border-[#FFC300]/30", className)}
        {...props}
      />
    );
  }
  return <div className={cn(CARD_SURFACE, className)} {...props} />;
}

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
