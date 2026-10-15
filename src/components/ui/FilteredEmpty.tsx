import Link from "next/link";
import { SearchX } from "lucide-react";

/** Estado vacío cuando hay filtros aplicados: distinto de "todavía no hay datos". */
export function FilteredEmpty({ clearHref, noun = "resultado" }: { clearHref: string; noun?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <SearchX className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-base font-semibold text-slate-700">Ningún {noun} coincide con estos filtros</p>
      <p className="text-sm text-slate-400 mt-1">Probá con otros valores o quitá algún filtro.</p>
      <Link href={clearHref} className="mt-4 text-sm font-medium text-brand-700 hover:underline">
        Limpiar filtros
      </Link>
    </div>
  );
}
