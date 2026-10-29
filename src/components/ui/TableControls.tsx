import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { pageWindow, tableHref, type Page, type SearchParamsRecord, type TableQuery } from "@/lib/table";

/** Estado de orden/URL que comparten los encabezados clicables de un listado. */
export interface SortContext {
  basePath: string;
  searchParams: SearchParamsRecord;
  query: Pick<TableQuery, "sort" | "dir">;
}

interface SortableThProps {
  label: string;
  field: string;
  ctx: SortContext;
  className?: string;
  /** Estilo de las tablas sin mayúsculas (marketing, promociones...): texto gris más chico y con más aire. */
  plain?: boolean;
}

const TH_BASE = "text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4";
const TH_PLAIN = "text-left text-xs font-medium text-slate-400 px-5 py-3";

/** Encabezado de columna que ordena el listado al hacer clic (alterna asc/desc). */
export function SortableTh({ label, field, ctx, className, plain }: SortableThProps) {
  const active = ctx.query.sort === field;
  const nextDir = active && ctx.query.dir === "asc" ? "desc" : "asc";
  const Icon = !active ? ArrowUpDown : ctx.query.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={cn(plain ? TH_PLAIN : TH_BASE, className)}
      aria-sort={active ? (ctx.query.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={tableHref(ctx.basePath, ctx.searchParams, { sort: field, dir: nextDir, page: undefined })}
        className={cn("inline-flex items-center gap-1 hover:text-slate-800 transition-colors", active && "text-slate-800")}
      >
        {label}
        <Icon className={cn("w-3 h-3", active ? "text-brand-700" : "text-slate-300")} aria-hidden="true" />
      </Link>
    </th>
  );
}

/** Encabezado de columna: ordenable si el listado recibe su contexto de orden, texto plano si no. */
export function Th({ label, field, sort, className, plain }: { label: string; field: string; sort?: SortContext; className?: string; plain?: boolean }) {
  if (sort) return <SortableTh label={label} field={field} ctx={sort} className={className} plain={plain} />;
  return <th scope="col" className={cn(plain ? TH_PLAIN : TH_BASE, className)}>{label}</th>;
}

interface PaginationProps {
  basePath: string;
  searchParams: SearchParamsRecord;
  page: Page<unknown>;
  /** Plural ("alumnos"). */
  noun?: string;
  /** Singular ("alumno"), para cuando hay un solo resultado. */
  nounSingular?: string;
}

/** Pie del listado: "Mostrando 1–25 de 120" y navegación por páginas (todo con enlaces, sin JavaScript). */
export function Pagination({ basePath, searchParams, page, noun = "resultados", nounSingular }: PaginationProps) {
  if (page.total === 0) return null;
  const href = (p: number) => tableHref(basePath, searchParams, { page: p === 1 ? undefined : String(p) });
  const linkBase = "inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-xs font-medium transition-colors";

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-slate-500" aria-label="Paginación">
      <p>
        Mostrando {page.from}–{page.to} de {page.total} {page.total === 1 && nounSingular ? nounSingular : noun}
      </p>
      {page.pageCount > 1 && (
        <div className="flex max-w-full flex-wrap items-center gap-1">
          {page.page > 1 ? (
            <Link href={href(page.page - 1)} className={cn(linkBase, "hover:bg-slate-100")} aria-label="Página anterior">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          ) : (
            <span className={cn(linkBase, "text-slate-300")} aria-hidden="true">
              <ChevronLeft className="w-4 h-4" />
            </span>
          )}
          {pageWindow(page.page, page.pageCount).map((n, i) =>
            n === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-slate-300">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                aria-current={n === page.page ? "page" : undefined}
                className={cn(linkBase, n === page.page ? "bg-brand-700 text-white" : "hover:bg-slate-100")}
              >
                {n}
              </Link>
            )
          )}
          {page.page < page.pageCount ? (
            <Link href={href(page.page + 1)} className={cn(linkBase, "hover:bg-slate-100")} aria-label="Página siguiente">
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className={cn(linkBase, "text-slate-300")} aria-hidden="true">
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
