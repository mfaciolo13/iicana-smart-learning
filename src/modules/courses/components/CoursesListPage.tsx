import Link from "next/link";
import { CourseList } from "./CourseList";
import { getCourses } from "../services/courses.service";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/lib/level-labels";

const STATUS_ORDER = ["active", "inactive", "completed"];
const STATUS_LABELS: Record<string, string> = { active: "Activo", inactive: "Inactivo", completed: "Finalizado" };

type SearchParams = Record<string, string | undefined>;

/**
 * Listado de cursos con búsqueda, filtros, orden y paginación. Lo usan director y administrativo;
 * sólo el director (canManage) los crea.
 */
export async function CoursesListPage({ sp, basePath, canManage }: { sp: SearchParams; basePath: string; canManage: boolean }) {
  const { q } = sp;
  const query = parseTableQuery(sp, {
    sortable: ["name", "level", "schedule", "teacher", "capacity", "status"],
    defaultSort: "name",
  });

  const all = await getCourses();

  const teacherNames = [...new Set(all.map((c) => c.teacherName).filter((n): n is string => Boolean(n)))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    { key: "nivel", label: "Nivel", type: "select", options: LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })) },
    { key: "estado", label: "Estado", type: "select", options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
    {
      key: "docente",
      label: "Docente",
      type: "select",
      options: [...teacherNames.map((n) => ({ value: n, label: n })), { value: "none", label: "Sin docente" }],
    },
    {
      key: "cupo",
      label: "Cupo",
      type: "select",
      options: [
        { value: "disponible", label: "Con lugar disponible" },
        { value: "completo", label: "Completo" },
      ],
    },
  ];
  const filters = parseFilters(sp, fields);

  let courses = all;
  if (q) courses = courses.filter((c) => matchesSearch(c.name, q));
  if (filters.nivel) courses = courses.filter((c) => c.level === filters.nivel);
  if (filters.estado) courses = courses.filter((c) => c.status === filters.estado);
  if (filters.docente) courses = courses.filter((c) => (filters.docente === "none" ? !c.teacherName : c.teacherName === filters.docente));
  if (filters.cupo) courses = courses.filter((c) => (c.enrollmentCount >= c.maxCapacity) === (filters.cupo === "completo"));

  const sorted = sortRows(courses, query, {
    name: (c) => c.name,
    level: (c) => LEVEL_ORDER.indexOf(c.level),
    schedule: (c) => c.schedule,
    teacher: (c) => c.teacherName,
    capacity: (c) => (c.maxCapacity > 0 ? c.enrollmentCount / c.maxCapacity : 0),
    status: (c) => STATUS_ORDER.indexOf(c.status),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;
  const active = all.filter((c) => c.status === "active").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cursos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {active} activo{active !== 1 ? "s" : ""} de {all.length} en total
          </p>
        </div>
        {canManage && (
          <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary" })}>
            + Nuevo curso
          </Link>
        )}
      </div>

      <SearchInput placeholder="Buscar por nombre..." resultCount={courses.length} className="mb-3" />
      <FilterBar fields={fields} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && courses.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="curso" />
        ) : (
          <>
            <CourseList courses={page.rows} sort={{ basePath, searchParams: sp, query }} basePath={basePath} canManage={canManage} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="cursos" nounSingular="curso" />
          </>
        )}
      </div>
    </div>
  );
}
