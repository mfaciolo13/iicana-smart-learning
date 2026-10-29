"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Select } from "@/components/ui/Input";
import { describeActiveFilters, filterKeys, parseFilters, type FilterField } from "@/lib/filters";

interface FilterBarProps {
  fields: FilterField[];
  className?: string;
}

const CONTROL =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500";

/**
 * Barra de filtros de un listado. Cada cambio se aplica al instante y queda en la URL
 * (?nivel=&estado=&desde=...): se puede compartir, recargar y volver atrás. Cambiar un filtro
 * vuelve a la primera página y respeta el orden elegido. Los filtros aplicados se muestran como
 * chips con una "x" y un botón para limpiarlos todos.
 */
export function FilterBar({ fields, className }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const current = Object.fromEntries(params.entries());
  const values = parseFilters(current, fields);
  const q = params.get("q") ?? undefined;
  const active = describeActiveFilters(values, fields, q);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    update(Object.fromEntries(filterKeys(fields).map((k) => [k, undefined])));
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filtros">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            {f.label}
            {f.type === "select" ? (
              <Select className={CONTROL} value={values[f.key] ?? ""} onChange={(e) => update({ [f.key]: e.target.value || undefined })}>
                <option value="">{f.placeholder ?? "Todos"}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : (
              <input type="date" className={CONTROL} value={values[f.key] ?? ""} onChange={(e) => update({ [f.key]: e.target.value || undefined })} />
            )}
          </label>
        ))}
      </div>

      {active.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
          {active.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-800 text-xs font-medium pl-2.5 pr-1 py-1">
              {a.label}: {a.valueLabel}
              <button
                type="button"
                onClick={() => update({ [a.key]: undefined })}
                className="rounded-full p-0.5 hover:bg-brand-100"
                aria-label={`Quitar filtro ${a.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2">
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
