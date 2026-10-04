import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------ Checkbox ----------------------------- */

interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
}

export function Checkbox({
  checked,
  defaultChecked,
  indeterminate = false,
  disabled,
  onCheckedChange,
  className,
  ...props
}: CheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const isOn = indeterminate || !!checked;

  return (
    <span
      data-slot="checkbox"
      className={cn("relative inline-flex size-4 shrink-0", className)}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-label={props["aria-label"]}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none flex size-4 items-center justify-center rounded-[5px] border border-input bg-input/40 text-primary-foreground transition-colors",
          isOn && "border-primary bg-primary",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
          "peer-disabled:opacity-50",
        )}
      >
        {indeterminate ? (
          <Minus className="size-3" strokeWidth={3} />
        ) : (
          <Check
            className={cn("size-3 transition-opacity", isOn ? "opacity-100" : "opacity-0")}
            strokeWidth={3}
          />
        )}
      </span>
    </span>
  );
}

/* ------------------------------- Switch ------------------------------ */

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
}

export function Switch({
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  className,
  ...props
}: SwitchProps) {
  return (
    <label
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        "has-[:checked]:bg-primary bg-input",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        aria-label={props["aria-label"]}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span className="pointer-events-none ml-0.5 block size-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}
