import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFC300] focus:ring-offset-2 focus:ring-offset-[#252422]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#FFC300] text-[#1C1B1A]",
        secondary: "border-transparent bg-white/10 text-white",
        destructive: "border-transparent bg-rose-500 text-white",
        outline: "border-white/20 text-white",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
