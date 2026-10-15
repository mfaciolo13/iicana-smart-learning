import Link from "next/link";
import { GradeList } from "./GradeList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { ExportButton } from "@/components/ui/ExportButton";
import { plural } from "@/lib/plural";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { GRADE_TYPE_ORDER as TYPE_ORDER, buildGradeFilterFields, filterGrades } from "../lib/filters";
import type { GradeWithDetails } from "../types";

type SearchParams = Record<string, string | undefined>;

interface GradesListPageProps {
  sp: SearchParams;
  basePath: string;
  grades: GradeWithDetails[];
  /** Nombres de los cursos que se pueden elegir en el filtro (todos, o sólo los del docente). */
  courseNames: string[];
  /** Si se pasa, se muestra el botón "Cargar nota" hacia esa ruta. */
  newHref?: string;
  /** Si se pasa, se muestra "Exportar Excel" (con los filtros actuales) hacia esa ruta. */
  exportHref?: string;
}

/** Listado de notas con búsqueda, filtros, orden y paginación (director, administrativo y profesor). */
export function GradesListPage({ sp, basePath, grades, courseNames, newHref, exportHref }: GradesListPageProps) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "course", "type", "score", "date"],
    defaultSort: "date",
    defaultDir: "desc",
  });

  const fields = buildGradeFilterFields(courseNames);
  const { list, filters } = filterGrades(grades, sp, fields);

  const sorted = sortRows(list, query, {
    student: (g) => g.studentName,
    course: (g) => g.courseName,
    type: (g) => TYPE_ORDER.indexOf(g.evaluationType),
    score: (g) => Number(g.score),
    date: (g) => new Date(g.evaluatedAt).getTime(),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notas</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {hasFilters
              ? `${list.length} de ${plural(grades.length, "evaluación registrada", "evaluaciones registradas")}`
              : plural(grades.length, "evaluación registrada", "evaluaciones registradas")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {exportHref && <ExportButton href={exportHref} searchParams={sp} />}
          {newHref && (
            <Link href={newHref} className={buttonVariants({ variant: "primary" })}>
              + Cargar nota
            </Link>
          )}
        </div>
      </div>

      <SearchInput placeholder="Buscar por alumno o DNI..." resultCount={list.length} className="mb-3" />
      <FilterBar fields={fields} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && list.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="resultado" />
        ) : (
          <>
            <GradeList grades={page.rows} showNewLink={Boolean(newHref)} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="notas" nounSingular="nota" />
          </>
        )}
      </div>
    </div>
  );
}
