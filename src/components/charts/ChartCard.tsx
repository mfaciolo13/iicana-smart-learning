import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Enlace "Ver todo" de la esquina. */
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  className?: string;
  /** Si es true se muestra el mensaje vacío en lugar del gráfico. */
  empty?: boolean;
  emptyText?: string;
  /** Texto para lectores de pantalla con la conclusión del gráfico (G-06). */
  summary?: string;
}

/** Contenedor común de los gráficos: título, subtítulo, enlace y estado vacío. */
export function ChartCard({ title, subtitle, href, hrefLabel = "Ver todo", children, className, empty, emptyText, summary }: ChartCardProps) {
  return (
    <section className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm p-5", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {href && (
          <Link href={href} className="text-xs text-brand-700 hover:underline whitespace-nowrap">
            {hrefLabel}
          </Link>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      {summary && <p className="sr-only">{summary}</p>}
      {empty ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400 text-center px-4">
          {emptyText ?? "Todavía no hay datos para mostrar"}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** Esqueleto con la forma de una ChartCard, para usar de fallback en <Suspense>. */
export function ChartSkeleton({ height = 220, className }: { height?: number; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse", className)} aria-hidden="true">
      <div className="h-4 w-40 bg-slate-100 rounded mb-2" />
      <div className="h-3 w-56 bg-slate-100 rounded mb-5" />
      <div className="bg-slate-50 rounded-lg" style={{ height }} />
    </div>
  );
}
