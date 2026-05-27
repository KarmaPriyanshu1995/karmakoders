import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFC300] disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-[#FFC300] text-[#1C1B1A] hover:bg-[#FFC300]/90 hover:shadow-[0_0_20px_rgba(255,195,0,0.35)] hover:-translate-y-0.5",
        destructive: "bg-rose-500 text-white hover:bg-rose-500/90",
        outline: "border border-[#FFC300]/50 bg-transparent text-[#FFC300] hover:bg-[#FFC300] hover:text-[#1C1B1A] hover:shadow-[0_0_20px_rgba(255,195,0,0.35)] hover:-translate-y-0.5",
        secondary: "bg-[#1C1B1A] text-[#D6D6D6] hover:bg-[#1C1B1A]/80 border border-white/10",
        ghost: "hover:bg-white/10 text-slate-300 hover:text-white",
        link: "text-[#FFC300] underline-offset-4 hover:underline",
        glass: "bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10 hover:border-[#FFC300]/30 hover:shadow-[0_0_20px_rgba(255,195,0,0.2)] hover:-translate-y-0.5",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
