import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

const sameValue = (a: string | number | null | undefined, b: string | number) =>
  a != null && String(a) === String(b);

/* Shared popover behaviour (fixed positioning + dismissal). */
function useMenu(align: "start" | "end" = "start") {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  const update = React.useCallback(() => {
    const element = wrapRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const left =
      align === "end"
        ? Math.max(8, rect.right - width)
        : Math.min(rect.left, window.innerWidth - width - 8);
    setStyle({ position: "fixed", top: rect.bottom + 6, left, width });
  }, [align]);

  React.useEffect(() => {
    if (!open) return;
    update();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return { open, setOpen, wrapRef, menuRef, style };
}

interface MenuShellProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  query: string;
  setQuery: (value: string) => void;
  searchPlaceholder: string;
  options: SelectOption[];
  emptyText: string;
  highlighted: number;
  setHighlighted: (value: number) => void;
  isSelected: (option: SelectOption) => boolean;
  onPick: (option: SelectOption) => void;
  multiple?: boolean;
}

function MenuShell({
  menuRef,
  style,
  query,
  setQuery,
  searchPlaceholder,
  options,
  emptyText,
  highlighted,
  setHighlighted,
  isSelected,
  onPick,
  multiple,
}: MenuShellProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      style={style}
      className="z-50 flex max-h-72 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-scale-in"
    >
      <div className="relative border-b border-border p-1.5">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 w-full rounded-md bg-transparent pr-2 pl-7 text-xs outline-none placeholder:text-muted-foreground/70"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlighted(Math.min(highlighted + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlighted(Math.max(highlighted - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const option = options[highlighted];
              if (option) onPick(option);
            }
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {options.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          options.map((option, index) => {
            const selected = isSelected(option);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => onPick(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  "disabled:pointer-events-none disabled:opacity-40",
                  index === highlighted && "bg-accent text-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center",
                    multiple && "rounded-[4px] border border-input",
                    multiple && selected && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {selected ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="block truncate text-[0.625rem] text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}

function filterOptions(options: SelectOption[], query: string) {
  if (!query.trim()) return options;
  const needle = query.trim().toLowerCase();
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) ||
      option.description?.toLowerCase().includes(needle),
  );
}

/* ---------------------------- Single select --------------------------- */

interface SelectMenuProps {
  options: SelectOption[];
  value: string | number | null;
  onValueChange: (value: string | number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
}

export function SelectMenu({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  clearable,
  disabled,
  className,
  id,
  ...aria
}: SelectMenuProps) {
  const menu = useMenu("start");
  const [query, setQuery] = React.useState("");
  const [highlighted, setHighlighted] = React.useState(0);

  const filtered = React.useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

  const selected = options.find((option) => sameValue(value, option.value));

  const pick = (option: SelectOption) => {
    onValueChange(option.value);
    menu.setOpen(false);
    setQuery("");
  };

  return (
    <div ref={menu.wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={aria["aria-invalid"]}
        aria-haspopup="listbox"
        aria-expanded={menu.open}
        onClick={() => {
          setQuery("");
          setHighlighted(
            Math.max(
              filtered.findIndex((option) => sameValue(value, option.value)),
              0,
            ),
          );
          menu.setOpen(!menu.open);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-input/30 px-3 text-left text-sm shadow-xs transition-[border-color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        )}
      >
        <span
          className={cn(
            "truncate",
            selected ? "text-foreground" : "text-muted-foreground/70",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <span className="flex items-center gap-1">
          {clearable && selected && !disabled ? (
            <span
              role="button"
              aria-label="Clear"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                onValueChange(null);
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </span>
      </button>

      {menu.open ? (
        <MenuShell
          menuRef={menu.menuRef}
          style={menu.style}
          query={query}
          setQuery={setQuery}
          searchPlaceholder={searchPlaceholder}
          options={filtered}
          emptyText={emptyText}
          highlighted={Math.min(highlighted, Math.max(filtered.length - 1, 0))}
          setHighlighted={setHighlighted}
          isSelected={(option) => sameValue(value, option.value)}
          onPick={pick}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------- Multi select ---------------------------- */

interface MultiSelectProps {
  options: SelectOption[];
  values: (string | number)[];
  onValuesChange: (values: (string | number)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  disabled,
  className,
}: MultiSelectProps) {
  const menu = useMenu("start");
  const [query, setQuery] = React.useState("");
  const [highlighted, setHighlighted] = React.useState(0);

  const filtered = React.useMemo(
    () => filterOptions(options, query),
    [options, query],
  );

  const selectedOptions = options.filter((option) =>
    values.some((value) => sameValue(value, option.value)),
  );

  const toggle = (option: SelectOption) => {
    if (values.some((value) => sameValue(value, option.value))) {
      onValuesChange(values.filter((value) => !sameValue(value, option.value)));
    } else {
      onValuesChange([...values, option.value]);
    }
    setQuery("");
  };

  return (
    <div ref={menu.wrapRef} className={cn("relative min-w-0", className)}>
      <div
        onClick={() => !disabled && menu.setOpen(true)}
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-input/30 px-2 py-1 shadow-xs transition-[border-color,box-shadow]",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25",
          disabled && "cursor-not-allowed opacity-50",
          menu.open && "border-ring ring-2 ring-ring/25",
        )}
      >
        {selectedOptions.map((option) => (
          <span
            key={option.value}
            className="inline-flex items-center gap-1 rounded-md bg-primary/12 px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary"
          >
            {option.label}
            <span
              role="button"
              aria-label={`Remove ${option.label}`}
              onClick={(event) => {
                event.stopPropagation();
                toggle(option);
              }}
              className="rounded hover:bg-primary/20"
            >
              <X className="size-3" />
            </span>
          </span>
        ))}
        <input
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!menu.open) menu.setOpen(true);
          }}
          onFocus={() => setHighlighted(0)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !query && selectedOptions.length) {
              onValuesChange(
                values.filter(
                  (value) =>
                    !sameValue(value, selectedOptions[selectedOptions.length - 1].value),
                ),
              );
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlighted(Math.min(highlighted + 1, filtered.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlighted(Math.max(highlighted - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const option = filtered[highlighted];
              if (option) toggle(option);
            }
          }}
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      {menu.open ? (
        <MenuShell
          multiple
          menuRef={menu.menuRef}
          style={menu.style}
          query={query}
          setQuery={setQuery}
          searchPlaceholder={searchPlaceholder}
          options={filtered}
          emptyText={emptyText}
          highlighted={Math.min(highlighted, Math.max(filtered.length - 1, 0))}
          setHighlighted={setHighlighted}
          isSelected={(option) =>
            values.some((value) => sameValue(value, option.value))
          }
          onPick={toggle}
        />
      ) : null}
    </div>
  );
}
