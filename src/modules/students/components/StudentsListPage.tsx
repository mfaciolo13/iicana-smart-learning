import Link from "next/link";
import { StudentList } from "./StudentList";
import { buttonVariants } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { ExportButton } from "@/components/ui/ExportButton";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { LEVEL_ORDER } from "@/lib/level-labels";
import { STUDENT_STATUS_ORDER, getFilteredStudents } from "../services/student-list.service";

const STATUS_ORDER = STUDENT_STATUS_ORDER;

type SearchParams = Record<string, string | undefined>;

/** Listado de alumnos con búsqueda, filtros, orden y paginación. Lo usan director y administrativo. */
export async function StudentsListPage({ sp, basePath }: { sp: SearchParams; basePath: string }) {
  const { q } = sp;
  const query = parseTableQuery(sp, { sortable: ["name", "dni", "email", "level", "status"], defaultSort: "name" });
  const { all, students, fields, filters } = await getFilteredStudents(sp);

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
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton href="/api/reports/students" searchParams={sp} />
          <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary" })}>
            + Nuevo alumno
          </Link>
        </div>
      </div>

      <SearchInput placeholder="Buscar por nombre, email o DNI..." resultCount={students.length} className="mb-3" />
      <FilterBar fields={fields} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && students.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="alumno" />
        ) : (
          <>
            <StudentList students={page.rows} basePath={basePath} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="alumnos" nounSingular="alumno" />
          </>
        )}
      </div>
    </div>
  );
}
