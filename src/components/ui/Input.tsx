"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
      {children}
      {error ? (
        <p className="text-xs text-danger-500" role="alert" aria-live="polite">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-slate-400">{helper}</p>
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
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(inputBase, error && inputError, className)}
      {...props}
    >
      {children}
    </select>
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
