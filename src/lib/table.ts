/**
 * Orden y paginación de listados, guiados por la URL (?sort=&dir=&page=). Funciones puras:
 * sirven tanto a las páginas del servidor como a los tests.
 */

export type SortDir = "asc" | "desc";
export type SearchParamsRecord = Record<string, string | undefined>;

export interface TableQuery {
  sort: string;
  dir: SortDir;
  page: number;
  pageSize: number;
}

interface ParseOptions {
  /** Campos por los que se puede ordenar; cualquier otro valor de la URL se ignora. */
  sortable: string[];
  defaultSort: string;
  defaultDir?: SortDir;
  pageSize?: number;
}

export const DEFAULT_PAGE_SIZE = 25;

export function parseTableQuery(sp: SearchParamsRecord, opts: ParseOptions): TableQuery {
  const sort = sp.sort && opts.sortable.includes(sp.sort) ? sp.sort : opts.defaultSort;
  const dir: SortDir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : (opts.defaultDir ?? "asc");
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  return { sort, dir, page, pageSize: opts.pageSize ?? DEFAULT_PAGE_SIZE };
}

type Accessor<T> = (row: T) => string | number | null | undefined;

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** Ordena sin modificar el arreglo original; los valores vacíos van siempre al final. */
export function sortRows<T>(rows: T[], query: Pick<TableQuery, "sort" | "dir">, accessors: Record<string, Accessor<T>>): T[] {
  const get = accessors[query.sort];
  if (!get) return rows;
  const sign = query.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const emptyA = va === null || va === undefined || va === "";
    const emptyB = vb === null || vb === undefined || vb === "";
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
    return collator.compare(String(va), String(vb)) * sign;
  });
}

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
  /** Posición (1-based) de la primera y la última fila mostradas; 0 si no hay filas. */
  from: number;
  to: number;
}

export function paginate<T>(rows: T[], query: Pick<TableQuery, "page" | "pageSize">): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * query.pageSize;
  const slice = rows.slice(start, start + query.pageSize);
  return { rows: slice, total, page, pageCount, from: slice.length ? start + 1 : 0, to: start + slice.length };
}

/** URL del listado conservando los demás parámetros (q, status...) y aplicando los cambios. */
export function tableHref(basePath: string, sp: SearchParamsRecord, patch: SearchParamsRecord): string {
  const merged: SearchParamsRecord = { ...sp, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== "") qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** Números de página a mostrar: primera, última y la ventana alrededor de la actual, con huecos ("…"). */
export function pageWindow(page: number, pageCount: number): Array<number | "…"> {
  const keep = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}
