import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "default" | "brand" | "success" | "warning" | "danger" | "muted";

export interface StatTileProps {
  label: string;
  value: string | number;
  /** Línea secundaria debajo de la cifra. */
  sub?: string;
  icon?: LucideIcon;
  /** Si se pasa, toda la tarjeta es un link. */
  href?: string;
  /** Color de la cifra; warning/danger agregan además una línea superior de alerta. */
  tone?: Tone;
  /** Cifra en tamaño menor (montos largos). */
  compact?: boolean;
  className?: string;
}

const VALUE_TONE: Record<Tone, string> = {
  default: "text-slate-900",
  brand: "text-brand-700",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  muted: "text-slate-400",
};

const RULE_TONE: Partial<Record<Tone, string>> = {
  warning: "before:bg-amber-400",
  danger: "before:bg-red-500",
  success: "before:bg-emerald-500",
  brand: "before:bg-brand-500",
};

/**
 * Tarjeta de indicador: etiqueta en versalitas, cifra grande en serif e ícono discreto.
 * Reemplaza a las tarjetas con cuadradito de color de los paneles.
 */
export function StatTile({ label, value, sub, icon: Icon, href, tone = "default", compact, className }: StatTileProps) {
  const rule = RULE_TONE[tone];
  const base = cn(
    "group relative block bg-white rounded-xl border border-slate-200 p-4 transition-all",
    href && "hover:border-slate-300 hover:shadow-md",
    rule && "before:absolute before:left-4 before:right-4 before:top-0 before:h-0.5 before:rounded-b-full before:content-['']",
    rule,
    className
  );

  const body = (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 leading-tight">{label}</p>
        {Icon && (
          <Icon
            className={cn("w-4 h-4 shrink-0 text-slate-300 transition-colors", href && "group-hover:text-brand-700")}
            strokeWidth={1.75}
          />
        )}
      </div>
      <p
        className={cn(
          "font-display font-semibold tracking-tight leading-none tabular-nums",
          compact ? "text-xl" : "text-3xl",
          VALUE_TONE[tone]
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-2 leading-tight">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}

export function StatTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-[108px]", className)} aria-hidden="true">
      <div className="h-3 w-24 bg-slate-100 rounded mb-5" />
      <div className="h-7 w-14 bg-slate-100 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-100 rounded" />
    </div>
  );
}
