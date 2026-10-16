import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button as ProductButton, type ButtonProps as ProductButtonProps } from "@/components/product-ui";
import { cn } from "@/lib/utils";

/**
 * Sign Button: wraps the product-ui Button (site colours, radius and glow) and adds what Sign
 * needs on top: 44px minimum height, a visible yellow focus ring, rose-600 danger (AA with white
 * text), reduced-motion support and a loading state.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_TO_PRODUCT: Record<ButtonVariant, NonNullable<ProductButtonProps["variant"]>> = {
  primary: "default",
  secondary: "glass",
  ghost: "ghost",
  link: "link",
  danger: "destructive",
};

/** Shared by Button and IconButton: focus ring, reduced motion, weight. */
export const SIGN_BUTTON_BASE =
  "font-bold focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-11 rounded-xl px-3 text-sm",
  md: "h-11 rounded-xl px-5 text-sm",
  lg: "h-12 rounded-xl px-8 text-base",
};

/**
 * Colour classes applied after the caller's className, so tailwind-merge can never drop them
 * (for example a stray `text-white` would otherwise replace the primary button's dark text).
 */
const LOCKED_COLORS: Partial<Record<ButtonVariant, string>> = {
  primary: "bg-[#FFC300] text-[#1C1B1A]",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export function signButtonClasses(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return cn(SIGN_BUTTON_BASE, SIZE_CLASSES[size], variant === "link" && "px-0", className, LOCKED_COLORS[variant]);
}

export interface ButtonProps extends Omit<ProductButtonProps, "variant" | "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button, sets aria-busy and shows a spinner. */
  loading?: boolean;
  /** Replaces the label while loading, e.g. "Sending…". Becomes the accessible name. */
  loadingText?: string;
  /** Leading icon (lucide-react). Ignored with asChild: put the icon inside the child. */
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, loadingText, icon, className, disabled, children, asChild, ...props },
  ref
) {
  const classes = signButtonClasses(variant, size, className);
  if (asChild) {
    return (
      <ProductButton ref={ref} asChild variant={VARIANT_TO_PRODUCT[variant]} className={classes} {...props}>
        {children}
      </ProductButton>
    );
  }
  return (
    <ProductButton
      ref={ref}
      variant={VARIANT_TO_PRODUCT[variant]}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : icon ? (
        <span aria-hidden className="inline-flex">
          {icon}
        </span>
      ) : null}
      {loading && loadingText ? loadingText : children}
    </ProductButton>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, "size" | "icon" | "loadingText" | "children"> {
  /** Required: icon-only buttons have no visible text. */
  "aria-label": string;
  children: React.ReactNode;
}

/** Square 44px icon-only button. The icon is decorative; the aria-label names the action. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", loading = false, className, disabled, children, ...props },
  ref
) {
  return (
    <ProductButton
      ref={ref}
      size="icon"
      variant={VARIANT_TO_PRODUCT[variant]}
      className={cn(SIGN_BUTTON_BASE, "h-11 w-11 rounded-xl", className, LOCKED_COLORS[variant])}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" /> : <span aria-hidden className="inline-flex">{children}</span>}
    </ProductButton>
  );
});
