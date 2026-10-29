import Link from "next/link";
import { requireRole } from "@/lib/auth/helpers";
import { getAllComplaints } from "../services/complaints.service";
import { ComplaintList } from "./ComplaintList";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows, tableHref } from "@/lib/table";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";

const STATUS_TABS = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abiertos" },
  { value: "in_progress", label: "En proceso" },
  { value: "resolved", label: "Resueltos" },
  { value: "closed", label: "Cerrados" },
];
const STATUS_ORDER = ["open", "in_progress", "resolved", "closed"];
const TYPE_ORDER = ["academic", "administrative", "infrastructure", "teacher"];
const TYPE_LABELS: Record<string, string> = { academic: "Académico", administrative: "Administrativo", infrastructure: "Infraestructura", teacher: "Docente" };
const ROLE_LABELS: Record<string, string> = { alumno: "Alumno", profesor: "Docente", administrativo: "Administrativo", director: "Director" };

const FIELDS: FilterField[] = [
  { key: "tipo", label: "Tipo", type: "select", options: TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABELS[t] })) },
  { key: "rol", label: "Quién reclama", type: "select", options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })) },
  { key: "desde", label: "Desde", type: "date" },
  { key: "hasta", label: "Hasta", type: "date" },
];

type SearchParams = Record<string, string | undefined>;

/** Día (YYYY-MM-DD) en hora del instituto, para filtrar por rango sin corrimientos. */
function instituteDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
}

/** Listado de reclamos con pestañas por estado, búsqueda, filtros, orden y paginación (director y administrativo). */
export async function ComplaintsListPage({ sp, basePath }: { sp: SearchParams; basePath: string }) {
  await requireRole(["director", "administrativo"]);
  const { q } = sp;
  const query = parseTableQuery(sp, { sortable: ["user", "type", "status", "date"], defaultSort: "date", defaultDir: "desc" });
  const activeTab = STATUS_TABS.some((t) => t.value === sp.status) ? (sp.status as string) : "all";
  const filters = parseFilters(sp, FIELDS);

  // Lectura por Drizzle tras validar el rol: con el JWT del usuario, RLS devolvía 0 filas sin error (SCRUM-272).
  const all = await getAllComplaints();

  let list = activeTab === "all" ? all : all.filter((c) => c.status === activeTab);
  if (q) list = list.filter((c) => matchesSearch(c.authorName, q) || matchesSearch(c.description, q));
  if (filters.tipo) list = list.filter((c) => c.type === filters.tipo);
  if (filters.rol) list = list.filter((c) => c.authorRole === filters.rol);
  if (filters.desde || filters.hasta) list = list.filter((c) => inDateRange(instituteDay(c.createdAt), filters.desde, filters.hasta));

  const sorted = sortRows(list, query, {
    user: (c) => c.authorName,
    type: (c) => TYPE_ORDER.indexOf(c.type),
    status: (c) => STATUS_ORDER.indexOf(c.status),
    date: (c) => new Date(c.createdAt).getTime(),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0 || activeTab !== "all";

  const count = (s: string) => all.filter((c) => c.status === s).length;
  const openCount = count("open");
  const inProgressCount = count("in_progress");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reclamos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {openCount} abierto{openCount !== 1 ? "s" : ""}
            {inProgressCount > 0 && ` · ${inProgressCount} en proceso`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Abiertos", value: openCount, color: "text-amber-600" },
          { label: "En proceso", value: inProgressCount, color: "text-brand-600" },
          { label: "Resueltos", value: count("resolved"), color: "text-emerald-600" },
          { label: "Cerrados", value: count("closed"), color: "text-slate-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit max-w-full">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tableHref(basePath, sp, { status: tab.value === "all" ? undefined : tab.value, page: undefined })}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <SearchInput placeholder="Buscar por usuario o texto del reclamo..." resultCount={list.length} className="mb-3" />
      <FilterBar fields={FIELDS} className="mb-4" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        {hasFilters && list.length === 0 ? (
          <FilteredEmpty clearHref={basePath} noun="reclamo" />
        ) : (
          <>
            <ComplaintList complaints={page.rows} adminView detailBase={basePath} sort={{ basePath, searchParams: sp, query }} />
            <Pagination basePath={basePath} searchParams={sp} page={page} noun="reclamos" nounSingular="reclamo" />
          </>
        )}
      </div>
    </div>
  );
}
