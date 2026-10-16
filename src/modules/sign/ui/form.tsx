"use client";

import * as React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { Input as ProductInput, Label } from "@/components/product-ui";
import { cn } from "@/lib/utils";

/**
 * Sign form controls: the product-ui Input look (dark field, xl radius, muted placeholder) with a
 * visible border (white/35, about 3.2:1 on the site backgrounds), a solid yellow focus ring and a
 * rose border when invalid. text-base on phones stops iOS zooming into the field.
 */

const SIGN_FIELD_CLASSES =
  "border-white/35 text-base sm:text-sm focus-visible:border-[#FFC300] focus-visible:ring-2 focus-visible:ring-[#FFC300] aria-[invalid=true]:border-rose-400 motion-reduce:transition-none";

/** The product-ui Input's own classes, for controls it does not render (textarea, select). */
const PRODUCT_FIELD_COPY =
  "flex w-full rounded-xl border bg-black/40 px-3 py-2 text-white placeholder:text-[#A39F97] transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input(
  { className, ...props },
  ref
) {
  return <ProductInput ref={ref} className={cn(SIGN_FIELD_CLASSES, className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(function Textarea(
  { className, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(PRODUCT_FIELD_COPY, SIGN_FIELD_CLASSES, "min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});

/** Native select (best on phones) in the field style; options render on a dark list. */
export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          PRODUCT_FIELD_COPY,
          SIGN_FIELD_CLASSES,
          "h-11 appearance-none pr-10 [color-scheme:dark] [&>option]:bg-[#1C1B1A] [&>option]:text-white",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#A39F97]" />
    </div>
  );
});

const CHOICE_INPUT =
  "size-5 shrink-0 cursor-pointer accent-[#FFC300] [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] disabled:cursor-not-allowed";

type ChoiceProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
};

function Choice({ type, label, description, className, id, ...props }: ChoiceProps & { type: "checkbox" | "radio" }) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const descId = description ? `${inputId}-desc` : undefined;
  return (
    <div className={cn("flex min-h-11 items-start gap-3 py-2.5", className)}>
      <input id={inputId} type={type} aria-describedby={descId} className={cn(CHOICE_INPUT, "mt-px")} {...props} />
      <div className="text-sm leading-5">
        <label htmlFor={inputId} className="cursor-pointer font-medium text-white">
          {label}
        </label>
        {description ? (
          <p id={descId} className="mt-0.5 text-[#A39F97]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const Checkbox = (props: ChoiceProps) => <Choice type="checkbox" {...props} />;
export const Radio = (props: ChoiceProps) => <Choice type="radio" {...props} />;

/** Groups radios (or checkboxes) under a visible legend. */
export function RadioGroup({
  legend,
  hint,
  children,
  className,
}: {
  legend: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const hintId = React.useId();
  return (
    <fieldset className={cn("space-y-1", className)} aria-describedby={hint ? hintId : undefined}>
      <legend className="text-xs font-bold uppercase tracking-widest text-[#A39F97]">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-[#A39F97]">
          {hint}
        </p>
      ) : null}
      {children}
    </fieldset>
  );
}

type SwitchProps = Omit<React.ComponentProps<"button">, "onChange" | "value"> & {
  label: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/** On/off switch (role="switch"). State shows by thumb position as well as colour. */
export function Switch({ label, checked, defaultChecked = false, onCheckedChange, className, id, disabled, ...props }: SwitchProps) {
  const autoId = React.useId();
  const switchId = id ?? autoId;
  const [internal, setInternal] = React.useState(defaultChecked);
  const on = checked ?? internal;
  return (
    <div className={cn("flex min-h-11 items-center gap-3", className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => {
          if (checked === undefined) setInternal(!on);
          onCheckedChange?.(!on);
        }}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC300] focus-visible:ring-offset-2 focus-visible:ring-offset-[#252422] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
          on ? "border-[#FFC300] bg-[#FFC300]" : "border-white/35 bg-black/40"
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5 rounded-full shadow transition-transform motion-reduce:transition-none",
            on ? "translate-x-6 bg-[#1C1B1A]" : "translate-x-1 bg-[#A39F97]"
          )}
        />
      </button>
      <label htmlFor={switchId} className="cursor-pointer text-sm font-medium text-white">
        {label}
      </label>
    </div>
  );
}

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-required"?: boolean | "true" | "false";
};

export type FormFieldProps = {
  label: React.ReactNode;
  /** Short help shown under the field. */
  hint?: React.ReactNode;
  /** What went wrong and what to do. Marks the control invalid and is announced. */
  error?: React.ReactNode;
  required?: boolean;
  /** One form control (Input, Textarea, Select). FormField wires its id and aria attributes. */
  children: React.ReactElement<FieldControlProps>;
  className?: string;
};

/** Label + control + hint + error, with id, aria-describedby, aria-invalid and required wired up. */
export function FormField({ label, hint, error, required = false, children, className }: FormFieldProps) {
  const autoId = React.useId();
  const controlId = children.props.id ?? `${autoId}-control`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy =
    [children.props["aria-describedby"], hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const control = React.cloneElement(children, {
    id: controlId,
    required: required || children.props.required,
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={controlId}>
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-[#FFC300]">
            *
          </span>
        ) : null}
      </Label>
      {control}
      {hint ? (
        <p id={hintId} className="text-sm text-[#A39F97]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-rose-300">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
