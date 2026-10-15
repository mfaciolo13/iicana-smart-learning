import Link from "next/link";
import { TeacherList } from "@/modules/teachers/components/TeacherList";
import { buttonVariants } from "@/components/ui/Button";
import { getCachedTeachers } from "@/lib/query-cache";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";

const BASE_PATH = "/director/teachers";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { q } = sp;
  const query = parseTableQuery(sp, { sortable: ["name", "dni", "email", "specialization"], defaultSort: "name" });

  const all = await getCachedTeachers();

  const specializations = [...new Set(all.map((t) => t.specialization).filter((s): s is string => Boolean(s)))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    {
      key: "especializacion",
      label: "Especialización",
      type: "select",
      options: [...specializations.map((s) => ({ value: s, label: s })), { value: "none", label: "Sin especialización" }],
    },
  ];
  const filters = parseFilters(sp, fields);

  let teachers = all;
  if (q) teachers = teachers.filter((t) => matchesSearch(t.fullName, q) || matchesSearch(t.email, q) || matchesSearch(t.dni, q));
  if (filters.especializacion) {
    teachers = teachers.filter((t) => (filters.especializacion === "none" ? !t.specialization : t.specialization === filters.especializacion));
  }

  const sorted = sortRows(teachers, query, {
    name: (t) => t.fullName,
    dni: (t) => t.dni,
    email: (t) => t.email,
    specialization: (t) => t.specialization,
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Docentes</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {all.length} docente{all.length !== 1 ? "s" : ""} registrado{all.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/director/teachers/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo docente
        </Link>
      </div>

      <SearchInput placeholder="Buscar por nombre, email o DNI..." resultCount={teachers.length} className="mb-3" />
      {specializations.length > 0 && <FilterBar fields={fields} className="mb-4" />}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && teachers.length === 0 ? (
          <FilteredEmpty clearHref={BASE_PATH} noun="docente" />
        ) : (
          <>
            <TeacherList teachers={page.rows} sort={{ basePath: BASE_PATH, searchParams: sp, query }} />
            <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="docentes" nounSingular="docente" />
          </>
        )}
      </div>
    </div>
  );
}
