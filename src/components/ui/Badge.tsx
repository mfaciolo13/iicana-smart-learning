import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        success: "bg-success-50 text-emerald-700",
        warning: "bg-warning-50 text-amber-700",
        danger: "bg-danger-50 text-red-700",
        info: "bg-brand-50 text-brand-800",
        neutral: "bg-slate-100 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

const dotColors: Record<string, string> = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-brand-500",
  neutral: "bg-slate-400",
};

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = "neutral", children, className, dot = true }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant ?? "neutral"])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
