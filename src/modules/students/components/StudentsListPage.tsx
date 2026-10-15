import Link from "next/link";
import { StudentList } from "./StudentList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import type { StudentListItem } from "../types";
import { getCachedStudents } from "@/lib/query-cache";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";
import { LEVEL_LABELS, LEVEL_ORDER } from "@/lib/level-labels";
import { getStudentIdsInCourse, getStudentIdsWithDebt, listActiveCourseOptions } from "../services/student-filters.service";

const STATUS_ORDER = ["active", "suspended", "inactive", "graduated"];
const STATUS_LABELS: Record<string, string> = { active: "Activo", suspended: "Suspendido", inactive: "Inactivo", graduated: "Egresado" };

type SearchParams = Record<string, string | undefined>;

function buildFields(courseOptions: { id: string; name: string }[]): FilterField[] {
  return [
    {
      key: "nivel",
      label: "Nivel",
      type: "select",
      options: [...LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })), { value: "none", label: "Sin nivel" }],
    },
    { key: "estado", label: "Estado", type: "select", options: STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
    { key: "curso", label: "Curso", type: "select", options: courseOptions.map((c) => ({ value: c.id, label: c.name })) },
    {
      key: "deuda",
      label: "Deuda",
      type: "select",
      options: [
        { value: "con", label: "Con deuda vencida" },
        { value: "sin", label: "Sin deuda" },
      ],
    },
  ];
}

/** Listado de alumnos con búsqueda, filtros, orden y paginación. Lo usan director y administrativo. */
export async function StudentsListPage({ sp, basePath }: { sp: SearchParams; basePath: string }) {
  const { q } = sp;
  const query = parseTableQuery(sp, { sortable: ["name", "dni", "email", "level", "status"], defaultSort: "name" });
  const fields = buildFields(await listActiveCourseOptions());
  const filters = parseFilters(sp, fields);

  const all: StudentListItem[] = (await getCachedStudents()).map((s) => ({
    ...s,
    level: s.level as StudentListItem["level"],
    status: s.status as StudentListItem["status"],
  }));

  let students = all;
  if (q) students = students.filter((s) => matchesSearch(s.fullName, q) || matchesSearch(s.email, q) || matchesSearch(s.dni, q));
  if (filters.nivel) students = students.filter((s) => (filters.nivel === "none" ? !s.level : s.level === filters.nivel));
  if (filters.estado) students = students.filter((s) => s.status === filters.estado);
  if (filters.curso) {
    const inCourse = await getStudentIdsInCourse(filters.curso);
    students = students.filter((s) => inCourse.has(s.id));
  }
  if (filters.deuda) {
    const withDebt = await getStudentIdsWithDebt();
    students = students.filter((s) => withDebt.has(s.id) === (filters.deuda === "con"));
  }

  const sorted = sortRows(students, query, {
    name: (r) => r.fullName,
    dni: (r) => r.dni,
    email: (r) => r.email,
    level: (r) => (r.level ? LEVEL_ORDER.indexOf(r.level) : null),
    status: (r) => STATUS_ORDER.indexOf(r.status),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Alumnos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {hasFilters ? `${students.length} de ${all.length}` : all.length} alumno{all.length !== 1 ? "s" : ""}{" "}
            registrado{all.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary" })}>
          + Nuevo alumno
        </Link>
      </div>

      <SearchInput placeholder="Buscar por nombre, email o DNI..." resultCount={students.length} className="mb-3" />
      <FilterBar fields={fields} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && students.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="alumno" />
        ) : (
          <>
            <StudentList students={page.rows} basePath={basePath} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="alumnos" />
          </>
        )}
      </div>
    </div>
  );
}
