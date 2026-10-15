import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination, SortableTh, type SortContext } from "@/components/ui/TableControls";
import { formatDateAR } from "@/lib/format";
import { inDateRange, parseFilters, type FilterField } from "@/lib/filters";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { getAttendanceSessions } from "../services/attendance-sessions.service";
import type { AttendanceSession } from "../types";

const STATUS_COLORS = { high: "bg-emerald-500", mid: "bg-amber-400", low: "bg-red-500" };

type SearchParams = Record<string, string | undefined>;

const pctOf = (s: AttendanceSession) => (s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0);
const barColor = (pct: number) => (pct >= 80 ? STATUS_COLORS.high : pct >= 60 ? STATUS_COLORS.mid : STATUS_COLORS.low);

/**
 * Listado de clases con asistencia registrada (director, administrativo y profesor), con filtros por
 * curso, fechas y porcentaje, orden por columna y paginación. `courseIds` limita a los cursos del
 * docente; sin él se ven todos. El detalle de cada clase abre la pantalla de toma de lista.
 */
export async function AttendanceListPage({ sp, basePath, courseIds }: { sp: SearchParams; basePath: string; courseIds?: string[] }) {
  const query = parseTableQuery(sp, {
    sortable: ["date", "course", "present", "absent", "pct"],
    defaultSort: "date",
    defaultDir: "desc",
  });

  const all = await getAttendanceSessions(courseIds);
  const courseOptions = [...new Map(all.map((s) => [s.courseId, s.courseName])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const fields: FilterField[] = [
    { key: "curso", label: "Curso", type: "select", options: courseOptions },
    { key: "desde", label: "Desde", type: "date" },
    { key: "hasta", label: "Hasta", type: "date" },
    {
      key: "asistencia",
      label: "Asistencia",
      type: "select",
      options: [
        { value: "menos60", label: "Menos de 60%" },
        { value: "menos80", label: "Menos de 80%" },
        { value: "80mas", label: "80% o más" },
      ],
    },
  ];
  const filters = parseFilters(sp, fields);

  let sessions = all;
  if (filters.curso) sessions = sessions.filter((s) => s.courseId === filters.curso);
  if (filters.desde || filters.hasta) sessions = sessions.filter((s) => inDateRange(s.classDate, filters.desde, filters.hasta));
  if (filters.asistencia === "menos60") sessions = sessions.filter((s) => pctOf(s) < 60);
  if (filters.asistencia === "menos80") sessions = sessions.filter((s) => pctOf(s) < 80);
  if (filters.asistencia === "80mas") sessions = sessions.filter((s) => pctOf(s) >= 80);

  const sorted = sortRows(sessions, query, {
    date: (s) => s.classDate,
    course: (s) => s.courseName,
    present: (s) => s.present,
    absent: (s) => s.absent,
    pct: (s) => pctOf(s),
  });
  const page = paginate(sorted, query);
  const hasFilters = Object.keys(filters).length > 0;
  const sortCtx: SortContext = { basePath, searchParams: sp, query };
  const detailHref = (s: AttendanceSession) => `${basePath}/new?courseId=${s.courseId}&date=${s.classDate}&view=1`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Asistencia</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {all.length === 0
              ? "Sin registros aún"
              : hasFilters
                ? `${sessions.length} de ${all.length} clases registradas`
                : `${all.length} clase${all.length !== 1 ? "s" : ""} registrada${all.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href={`${basePath}/new`} className={buttonVariants({ variant: "primary" })}>
          + Tomar asistencia
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <p className="text-base font-semibold text-slate-700">Sin registros de asistencia</p>
          <p className="text-sm text-slate-400 mt-1">Empezá tomando la asistencia de una clase.</p>
          <Link href={`${basePath}/new`} className={`mt-4 ${buttonVariants({ variant: "primary" })}`}>
            Tomar asistencia
          </Link>
        </div>
      ) : (
        <>
          <FilterBar fields={fields} className="mb-4" />

          {hasFilters && sessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <FilteredEmpty clearHref={basePath} noun="resultado" />
            </div>
          ) : (
            <>
              <div className="sm:hidden space-y-2">
                {page.rows.map((s) => {
                  const pct = pctOf(s);
                  return (
                    <Link
                      key={`${s.courseId}-${s.classDate}`}
                      href={detailHref(s)}
                      className="block p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{s.courseName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDateAR(s.classDate)}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 shrink-0">{pct}%</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-emerald-600 font-medium shrink-0">{s.present}P</span>
                        {s.absent > 0 && <span className="text-xs text-red-500 font-medium shrink-0">{s.absent}A</span>}
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-130">
                  <thead>
                    <tr className="border-b-2 border-brand-700">
                      <SortableTh label="Fecha" field="date" ctx={sortCtx} className="px-6" />
                      <SortableTh label="Curso" field="course" ctx={sortCtx} />
                      <SortableTh label="Presentes" field="present" ctx={sortCtx} />
                      <SortableTh label="Ausentes" field="absent" ctx={sortCtx} />
                      <SortableTh label="% Asistencia" field="pct" ctx={sortCtx} className="hidden md:table-cell" />
                      <th className="py-3 pr-6" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {page.rows.map((s) => {
                      const pct = pctOf(s);
                      return (
                        <tr key={`${s.courseId}-${s.classDate}`} className="hover:bg-brand-50 transition-colors">
                          <td className="py-3.5 pl-6 pr-4 font-medium text-slate-900">{formatDateAR(s.classDate)}</td>
                          <td className="py-3.5 pr-4 text-slate-700">{s.courseName}</td>
                          <td className="py-3.5 pr-4">
                            <span className="text-emerald-600 font-medium">{s.present}</span>
                            <span className="text-slate-400 text-xs"> / {s.total}</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-red-500 font-medium">{s.absent}</span>
                            {s.late > 0 && <span className="text-amber-500 text-xs ml-1">+{s.late} tarde</span>}
                          </td>
                          <td className="py-3.5 pr-4 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-600">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-6 text-right">
                            <Link href={detailHref(s)} className="text-brand-700 hover:underline text-xs font-medium inline-flex items-center gap-1">
                              Ver <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-1">
                <Pagination basePath={basePath} searchParams={sp} page={page} noun="clases" nounSingular="clase" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
