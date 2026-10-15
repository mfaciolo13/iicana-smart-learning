import { FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/cn";

interface ExportButtonProps {
  /** Ruta de la exportación, por ejemplo "/api/reports/payments". */
  href: string;
  /** Parámetros actuales de la pantalla: se reenvían para que el Excel tenga lo mismo que se ve. */
  searchParams: Record<string, string | undefined>;
  label?: string;
  className?: string;
}

/** Parámetros que no cambian el contenido (orden y página) y por eso no viajan a la exportación. */
const SCREEN_ONLY = new Set(["page", "sort", "dir"]);

/** Descarga el Excel del listado con los mismos filtros que tiene aplicados la pantalla. */
export function ExportButton({ href, searchParams, label = "Exportar Excel", className }: ExportButtonProps) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && !SCREEN_ONLY.has(k)) qs.set(k, v);
  }
  const url = qs.toString() ? `${href}?${qs}` : href;
  return (
    <a
      href={url}
      download
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-colors",
        className
      )}
    >
      <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
      {label}
    </a>
  );
}
