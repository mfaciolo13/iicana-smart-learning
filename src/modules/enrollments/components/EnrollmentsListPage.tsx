import Link from "next/link";
import { getEnrollments } from "../services/enrollments.service";
import { EnrollmentList } from "./EnrollmentList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/lib/level-labels";

const STATUS_ORDER = ["active", "completed", "withdrawn"];
const STATUS_LABELS: Record<string, string> = { active: "Activa", completed: "Completada", withdrawn: "Dada de baja" };

type SearchParams = Record<string, string | undefined>;

/** Día (YYYY-MM-DD) de una fecha en hora del instituto, para filtrar por rango sin corrimientos. */
function instituteDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}

/** Listado de inscripciones con búsqueda, filtros, orden y paginación (director y administrativo). */
export async function EnrollmentsListPage({ sp, basePath }: { sp: SearchParams; basePath: string }) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "dni", "course", "level", "date", "status"],
    defaultSort: "date",
    defaultDir: "desc",
  });

  const all = await getEnrollments();
  const courseNames = [...new Set(all.map((e) => e.courseName))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    { key: "estado", label: "Estado", type: "select", options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
    { key: "curso", label: "Curso", type: "select", options: courseNames.map((n) => ({ value: n, label: n })) },
    { key: "nivel", label: "Nivel", type: "select", options: LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })) },
    { key: "desde", label: "Inscripta desde", type: "date" },
    { key: "hasta", label: "Inscripta hasta", type: "date" },
  ];
  const filters = parseFilters(sp, fields);

  let list = all;
  if (q) list = list.filter((e) => matchesSearch(e.studentName, q) || matchesSearch(e.studentDni, q) || matchesSearch(e.courseName, q));
  if (filters.estado) list = list.filter((e) => e.status === filters.estado);
  if (filters.curso) list = list.filter((e) => e.courseName === filters.curso);
  if (filters.nivel) list = list.filter((e) => e.courseLevel === filters.nivel);
  if (filters.desde || filters.hasta) list = list.filter((e) => inDateRange(instituteDay(e.enrolledAt), filters.desde, filters.hasta));

  const sorted = sortRows(list, query, {
    student: (e) => e.studentName,
    dni: (e) => e.studentDni,
    course: (e) => e.courseName,
    level: (e) => LEVEL_ORDER.indexOf(e.courseLevel),
    date: (e) => new Date(e.enrolledAt).getTime(),
    status: (e) => STATUS_ORDER.indexOf(e.status),
  });
  const page = paginate(sorted, query);
  const active = all.filter((e) => e.status === "active").length;
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inscripciones</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} activa{active !== 1 ? "s" : ""} de {all.length} en total
          </p>
        </div>
        <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary" })}>
          + Nueva inscripción
        </Link>
      </div>

      <SearchInput placeholder="Buscar por alumno, DNI o curso..." resultCount={list.length} className="mb-3" />
      <FilterBar fields={fields} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && list.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="resultado" />
        ) : (
          <>
            <EnrollmentList enrollments={page.rows} showNewLink basePath={basePath} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="inscripciones" />
          </>
        )}
      </div>
    </div>
  );
}
