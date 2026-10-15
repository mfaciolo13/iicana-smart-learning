import Link from "next/link";
import { GradeList } from "./GradeList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { plural } from "@/lib/plural";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";
import type { GradeWithDetails } from "../types";

const TYPE_LABELS: Record<string, string> = { parcial: "Parcial", final: "Final", oral: "Oral", homework: "Tarea", quiz: "Quiz" };
const TYPE_ORDER = ["parcial", "final", "oral", "homework", "quiz"];

type SearchParams = Record<string, string | undefined>;

/** Día (YYYY-MM-DD) en hora del instituto, para filtrar por rango sin corrimientos. */
function instituteDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}

interface GradesListPageProps {
  sp: SearchParams;
  basePath: string;
  grades: GradeWithDetails[];
  /** Nombres de los cursos que se pueden elegir en el filtro (todos, o sólo los del docente). */
  courseNames: string[];
  /** Si se pasa, se muestra el botón "Cargar nota" hacia esa ruta. */
  newHref?: string;
}

/** Listado de notas con búsqueda, filtros, orden y paginación (director, administrativo y profesor). */
export function GradesListPage({ sp, basePath, grades, courseNames, newHref }: GradesListPageProps) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["student", "course", "type", "score", "date"],
    defaultSort: "date",
    defaultDir: "desc",
  });

  const fields: FilterField[] = [
    { key: "curso", label: "Curso", type: "select", options: courseNames.map((n) => ({ value: n, label: n })), placeholder: "Todos los cursos" },
    { key: "tipo", label: "Tipo de evaluación", type: "select", options: TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] })) },
    {
      key: "resultado",
      label: "Resultado",
      type: "select",
      options: [
        { value: "aprobada", label: "Aprobadas (7 o más)" },
        { value: "desaprobada", label: "Desaprobadas (menos de 7)" },
      ],
    },
    { key: "desde", label: "Desde", type: "date" },
    { key: "hasta", label: "Hasta", type: "date" },
  ];
  const filters = parseFilters(sp, fields);

  let list = grades;
  if (q) list = list.filter((g) => matchesSearch(g.studentName, q) || matchesSearch(g.studentDni, q));
  if (filters.curso) list = list.filter((g) => g.courseName === filters.curso);
  if (filters.tipo) list = list.filter((g) => g.evaluationType === filters.tipo);
  if (filters.resultado) list = list.filter((g) => (Number(g.score) >= 7) === (filters.resultado === "aprobada"));
  if (filters.desde || filters.hasta) list = list.filter((g) => inDateRange(instituteDay(g.evaluatedAt), filters.desde, filters.hasta));

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
        {newHref && (
          <Link href={newHref} className={buttonVariants({ variant: "primary" })}>
            + Cargar nota
          </Link>
        )}
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
