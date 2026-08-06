"use client";

import {
  forwardRef, cloneElement, isValidElement, Children,
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, KeyboardEvent, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function Field({ label, required, helper, error, className, children, id }: FieldProps) {
  const descriptionId = useId();
  const childrenWithProps = Children.map(children, (child) => {
    // `error` sólo se inyecta en los controles que lo aceptan; en un elemento DOM crudo (botones de cupo o
    // nota, input hidden) React emitía "Received `false` for a non-boolean attribute `error`" (SCRUM-237).
    if (!isValidElement(child) || (child.type !== Input && child.type !== Select && child.type !== Textarea)) {
      return child;
    }
    const control = child as React.ReactElement<{
      error?: boolean;
      "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
      "aria-describedby"?: string;
    }>;
    return cloneElement(control, {
      error: !!error,
      "aria-invalid": error ? true : control.props["aria-invalid"],
      "aria-describedby": [control.props["aria-describedby"], (error || helper) && descriptionId]
        .filter(Boolean).join(" ") || undefined,
    });
  });

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-wide text-slate-600"
        >
          {label}
          {required && <span className="text-danger-500 ml-0.5">*</span>}
        </label>
      )}
      {childrenWithProps}
      {error ? (
        <p id={descriptionId} className="text-xs text-danger-500" role="alert" aria-live="polite">
          {error}
        </p>
      ) : helper ? (
        <p id={descriptionId} className="text-xs text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-700 disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const inputError = "border-danger-500 focus:ring-danger-500 focus:border-danger-500";

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(inputBase, error && inputError, className)}
        {...props}
      />
    );
  }
);

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

/** Desde esta cantidad de opciones el desplegable muestra un buscador. */
const SEARCH_THRESHOLD = 8;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const sameOptions = (a: SelectOption[], b: SelectOption[]) =>
  a.length === b.length &&
  a.every((o, i) => o.value === b[i].value && o.label === b[i].label && o.disabled === b[i].disabled);

/**
 * `<select>` nativo; con muchas opciones se reemplaza visualmente por un desplegable con buscador.
 * El `<select>` real sigue montado (oculto) y es la fuente de verdad: register() de react-hook-form,
 * `value`/`defaultValue`, `required` y el submit de formularios funcionan igual. Al elegir una opción
 * se asigna su valor y se dispara un `change` para que lo vean los handlers.
 */
export function Select({ className, error, children, ref, id, ...props }: SelectProps) {
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const [options, setOptions] = useState<SelectOption[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const sync = useCallback(() => {
    const el = selectRef.current;
    if (!el) return;
    const next = Array.from(el.options).map((o) => ({
      value: o.value,
      label: o.text,
      disabled: o.disabled || (o.parentElement instanceof HTMLOptGroupElement && o.parentElement.disabled),
    }));
    setOptions((prev) => (sameOptions(prev, next) ? prev : next));
    setSelectedValue(el.value);
  }, []);

  useLayoutEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const form = el.form;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const onReset = () => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(sync, 0);
    };
    const observer = new MutationObserver(sync);
    observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    el.addEventListener("change", sync);
    form?.addEventListener("reset", onReset);
    return () => {
      clearTimeout(resetTimer);
      observer.disconnect();
      el.removeEventListener("change", sync);
      form?.removeEventListener("reset", onReset);
    };
  }, [sync]);

  // Captura cambios programáticos (setValue/reset de react-hook-form) que no disparan eventos.
  useLayoutEffect(sync);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Las opciones deshabilitadas con valor vacío son el placeholder ("Seleccioná un curso"), no una elección.
  const choices = options.filter((o) => !(o.value === "" && o.disabled));
  const searchable = choices.length >= SEARCH_THRESHOLD;

  const q = normalize(query.trim());
  const filtered = q ? choices.filter((o) => normalize(o.label).includes(q)) : choices;
  const selected = options.find((o) => o.value === selectedValue);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function setRefs(node: HTMLSelectElement | null) {
    selectRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLSelectElement | null }).current = node;
  }

  function focusTrigger() {
    (wrapperRef.current?.querySelector("button[role=combobox]") as HTMLButtonElement | null)?.focus();
  }

  function openList() {
    if (props.disabled) return;
    setQuery("");
    setActive(Math.max(choices.findIndex((o) => o.value === selectedValue), 0));
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function pick(option: SelectOption) {
    if (option.disabled) return;
    const el = selectRef.current;
    if (el) {
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    focusTrigger();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      focusTrigger();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className={searchable ? "relative" : "contents"}>
      <select
        ref={setRefs}
        id={searchable ? undefined : id}
        className={searchable ? "sr-only" : cn(inputBase, error && inputError, className)}
        tabIndex={searchable ? -1 : undefined}
        aria-hidden={searchable ? true : undefined}
        {...props}
      >
        {children}
      </select>

      {searchable && (
        <>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-haspopup="listbox"
            aria-label={props["aria-label"]}
            aria-labelledby={props["aria-labelledby"]}
            aria-describedby={props["aria-describedby"]}
            aria-required={props.required || props["aria-required"]}
            aria-invalid={error || props["aria-invalid"]}
            disabled={props.disabled}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={(e) => {
              if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                e.preventDefault();
                openList();
              }
            }}
            className={cn(inputBase, "flex items-center justify-between gap-2 text-left", error && inputError, className)}
          >
            <span className={cn("truncate", (!selected || selected.value === "") && "text-slate-400")}>
              {selected?.label || "Seleccioná una opción"}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="relative border-b border-slate-100 p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Buscar..."
                  aria-label="Buscar opción"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-400">Sin resultados</li>
                ) : (
                  filtered.map((o, i) => (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={o.value === selectedValue}
                      aria-disabled={o.disabled || undefined}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700",
                        i === active && "bg-brand-50",
                        o.value === selectedValue && "font-medium text-brand-800",
                        o.disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {o.value === selectedValue && <Check className="w-4 h-4 shrink-0" />}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(inputBase, "min-h-[80px] resize-y", error && inputError, className)}
      {...props}
    />
  );
}
