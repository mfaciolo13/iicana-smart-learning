import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  title,
  description,
  actions,
  footer,
  padding = "md",
  className,
  children,
}: CardProps) {
  const hasHeader = title || description || actions;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm",
        className
      )}
    >
      {hasHeader && (
        <div className={cn("flex flex-wrap items-start justify-between gap-4 border-b border-slate-100", paddingMap[padding])}>
          <div className="min-w-0 flex-1 basis-48 break-words">
            {title && (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex max-w-full flex-wrap gap-2">{actions}</div>}
        </div>
      )}

      <div className={cn(paddingMap[padding])}>{children}</div>

      {footer && (
        <div className={cn("border-t border-slate-100", paddingMap[padding])}>
          {footer}
        </div>
      )}
    </div>
  );
}
