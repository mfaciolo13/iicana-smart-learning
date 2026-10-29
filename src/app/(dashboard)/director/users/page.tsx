import Link from "next/link";
import { UserPlus } from "lucide-react";
import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { UserList } from "@/modules/users/components/UserList";
import type { UserListItem } from "@/modules/users/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows, tableHref } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";

const BASE_PATH = "/director/users";
const ROLE_ORDER = ["director", "administrativo", "profesor", "alumno"];
const ROLE_TABS = [
  { value: "all", label: "Todos" },
  { value: "director", label: "Directores" },
  { value: "administrativo", label: "Administrativos" },
  { value: "profesor", label: "Docentes" },
  { value: "alumno", label: "Alumnos" },
];

const FIELDS: FilterField[] = [
  { key: "desde", label: "Alta desde", type: "date" },
  { key: "hasta", label: "Alta hasta", type: "date" },
];

/** Día (YYYY-MM-DD) en hora del instituto, para filtrar por rango sin corrimientos. */
function instituteDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { q } = sp;
  const activeRole = ROLE_TABS.some((t) => t.value === sp.role) ? (sp.role as string) : "all";
  const query = parseTableQuery(sp, { sortable: ["name", "email", "role", "created"], defaultSort: "name" });
  const filters = parseFilters(sp, FIELDS);

  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .orderBy(asc(profiles.fullName));

  const allUsers: UserListItem[] = rows.map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role as UserListItem["role"],
    fullName: r.fullName,
    phone: r.phone ?? null,
    createdAt: new Date(r.createdAt),
  }));

  let filtered = q ? allUsers.filter((u) => matchesSearch(u.fullName, q) || matchesSearch(u.email, q)) : allUsers;
  if (activeRole !== "all") filtered = filtered.filter((u) => u.role === activeRole);
  if (filters.desde || filters.hasta) filtered = filtered.filter((u) => inDateRange(instituteDay(u.createdAt), filters.desde, filters.hasta));

  const sorted = sortRows(filtered, query, {
    name: (u) => u.fullName,
    email: (u) => u.email,
    role: (u) => ROLE_ORDER.indexOf(u.role),
    created: (u) => u.createdAt.getTime(),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0 || activeRole !== "all";

  const counts = {
    director: allUsers.filter((u) => u.role === "director").length,
    administrativo: allUsers.filter((u) => u.role === "administrativo").length,
    profesor: allUsers.filter((u) => u.role === "profesor").length,
    alumno: allUsers.filter((u) => u.role === "alumno").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {allUsers.length} usuario{allUsers.length !== 1 ? "s" : ""} en el sistema
          </p>
        </div>
        <Link
          href="/director/users/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium hover:bg-brand-800 transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo administrativo
        </Link>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Directores", value: counts.director, color: "text-amber-600" },
          { label: "Administrativos", value: counts.administrativo, color: "text-purple-600" },
          { label: "Docentes", value: counts.profesor, color: "text-brand-600" },
          { label: "Alumnos", value: counts.alumno, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + role filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <SearchInput placeholder="Buscar por nombre o email..." resultCount={filtered.length} />

        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {ROLE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tableHref(BASE_PATH, sp, { role: tab.value === "all" ? undefined : tab.value, page: undefined })}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeRole === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <FilterBar fields={FIELDS} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && filtered.length === 0 ? (
          <FilteredEmpty clearHref={BASE_PATH} noun="usuario" />
        ) : (
          <>
            <UserList users={page.rows} sort={{ basePath: BASE_PATH, searchParams: sp, query }} />
            <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="usuarios" nounSingular="usuario" />
          </>
        )}
      </div>
    </div>
  );
}
