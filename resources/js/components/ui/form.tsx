import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------- Label ------------------------------- */

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs font-medium text-foreground select-none",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------- Input ------------------------------- */

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-input/30 px-3 py-1 text-sm shadow-xs",
        "placeholder:text-muted-foreground/70",
        "transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "file:mr-2 file:h-6 file:rounded file:border-0 file:bg-secondary file:px-2 file:text-xs file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

/* ----------------------------- Textarea ------------------------------ */

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-sm shadow-xs",
        "placeholder:text-muted-foreground/70",
        "field-sizing-content transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------ Select ------------------------------- */

export interface SelectProps extends React.ComponentProps<"select"> {
  containerClassName?: string;
}

export function Select({
  className,
  containerClassName,
  children,
  ...props
}: SelectProps) {
  return (
    <span
      data-slot="select"
      className={cn("relative inline-flex w-full", containerClassName)}
    >
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-input/30 pr-8 pl-3 text-sm shadow-xs",
          "transition-[border-color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

/* ------------------------------- Field ------------------------------- */

export function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

export function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field"
      className={cn("group/field flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function FieldLabel({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function FieldContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-[0.6875rem] text-muted-foreground", className)}
      {...props}
    />
  );
}

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  errors?: Array<{ message?: string } | undefined>;
}

export function FieldError({
  className,
  children,
  errors,
  ...props
}: FieldErrorProps) {
  const messages = React.useMemo(() => {
    if (children) return [];
    const list = (errors ?? [])
      .map((error) => error?.message)
      .filter((message): message is string => !!message);
    return Array.from(new Set(list));
  }, [children, errors]);

  if (!children && messages.length === 0) return null;

  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("text-[0.6875rem] font-medium text-destructive", className)}
      {...props}
    >
      {children}
      {!children && messages.length === 1 ? messages[0] : null}
      {!children && messages.length > 1 ? (
        <ul className="ml-3 list-disc">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </p>
  );
}
