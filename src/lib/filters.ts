/**
 * Filtros de listados guiados por la URL (?nivel=&estado=&desde=&hasta=...). Funciones puras,
 * compartidas por las páginas del servidor, la barra de filtros del cliente y los tests.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export type FilterField =
  | { key: string; label: string; type: "select"; options: FilterOption[]; placeholder?: string }
  | { key: string; label: string; type: "date" };

export type FilterValues = Record<string, string>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Valores válidos de cada filtro, tomados de la URL. Un valor que no esté en las opciones (o una
 * fecha mal formada) se descarta: un parámetro adulterado nunca rompe la página.
 */
export function parseFilters(sp: Record<string, string | undefined>, fields: FilterField[]): FilterValues {
  const out: FilterValues = {};
  for (const f of fields) {
    const raw = sp[f.key];
    if (!raw) continue;
    if (f.type === "select" && f.options.some((o) => o.value === raw)) out[f.key] = raw;
    if (f.type === "date" && isValidIsoDate(raw)) out[f.key] = raw;
  }
  return out;
}

export interface ActiveFilter {
  key: string;
  label: string;
  valueLabel: string;
}

/** Filtros aplicados, con textos legibles, para mostrarlos como chips. */
export function describeActiveFilters(values: FilterValues, fields: FilterField[], q?: string): ActiveFilter[] {
  const list: ActiveFilter[] = [];
  if (q) list.push({ key: "q", label: "Búsqueda", valueLabel: q });
  for (const f of fields) {
    const v = values[f.key];
    if (!v) continue;
    if (f.type === "select") {
      list.push({ key: f.key, label: f.label, valueLabel: f.options.find((o) => o.value === v)?.label ?? v });
    } else {
      const [y, m, d] = v.split("-");
      list.push({ key: f.key, label: f.label, valueLabel: `${d}/${m}/${y}` });
    }
  }
  return list;
}

/** ¿La fecha ISO cae dentro de [desde, hasta]? Los límites vacíos no restringen. */
export function inDateRange(date: string | null | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!date) return false;
  const day = date.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** Parámetros de la URL que pertenecen a los filtros (para limpiarlos sin tocar orden ni página). */
export function filterKeys(fields: FilterField[]): string[] {
  return ["q", ...fields.map((f) => f.key)];
}

/** Día (YYYY-MM-DD) de una fecha en hora del instituto, para filtrar por rango sin corrimientos de zona horaria. */
export function instituteDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}
