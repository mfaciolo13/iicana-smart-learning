import Link from "next/link";
import { AssessmentList } from "./AssessmentList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";
import type { AssessmentListItem } from "../types";

const STATUS_ORDER = ["draft", "published", "archived"];
const STATUS_LABELS: Record<string, string> = { draft: "Borrador", published: "Publicada", archived: "Archivada" };

type SearchParams = Record<string, string | undefined>;

/** Día (YYYY-MM-DD) en hora del instituto, para filtrar por rango sin corrimientos. */
function instituteDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}

interface AssessmentsListPageProps {
  sp: SearchParams;
  basePath: string;
  items: AssessmentListItem[];
  subtitle: string;
}

/** Listado de autoevaluaciones con resumen, búsqueda, filtros, orden y paginación (director y profesor). */
export function AssessmentsListPage({ sp, basePath, items, subtitle }: AssessmentsListPageProps) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["title", "course", "status", "questions", "attempts", "created"],
    defaultSort: "created",
    defaultDir: "desc",
  });

  const courseNames = [...new Set(items.map((a) => a.courseName))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    { key: "curso", label: "Curso", type: "select", options: courseNames.map((n) => ({ value: n, label: n })) },
    { key: "estado", label: "Estado", type: "select", options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
    { key: "desde", label: "Creada desde", type: "date" },
    { key: "hasta", label: "Creada hasta", type: "date" },
  ];
  const filters = parseFilters(sp, fields);

  let list = items;
  if (q) list = list.filter((a) => matchesSearch(a.topic, q) || matchesSearch(a.weekLabel, q));
  if (filters.curso) list = list.filter((a) => a.courseName === filters.curso);
  if (filters.estado) list = list.filter((a) => a.status === filters.estado);
  if (filters.desde || filters.hasta) list = list.filter((a) => inDateRange(instituteDay(a.createdAt), filters.desde, filters.hasta));

  const sorted = sortRows(list, query, {
    title: (a) => a.topic,
    course: (a) => a.courseName,
    status: (a) => STATUS_ORDER.indexOf(a.status),
    questions: (a) => a.questionCount,
    attempts: (a) => a.attemptCount,
    created: (a) => new Date(a.createdAt).getTime(),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;

  const total = items.length;
  const published = items.filter((a) => a.status === "published").length;
  const drafts = items.filter((a) => a.status === "draft").length;
  const totalAttempts = items.reduce((sum, a) => sum + a.attemptCount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Autoevaluaciones IA</h2>
          <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary", size: "sm" })}>
          + Nueva evaluación
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: total, color: "text-slate-700" },
          { label: "Publicadas", value: published, color: "text-emerald-600" },
          { label: "Borradores", value: drafts, color: "text-amber-600" },
          { label: "Intentos", value: totalAttempts, color: "text-brand-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <>
          <SearchInput placeholder="Buscar por tema o semana..." resultCount={list.length} className="mb-3" />
          <FilterBar fields={fields} className="mb-4" />
        </>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && list.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="resultado" />
        ) : (
          <>
            <AssessmentList assessments={page.rows} basePath={basePath} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="autoevaluaciones" nounSingular="autoevaluación" />
          </>
        )}
      </div>
    </div>
  );
}
