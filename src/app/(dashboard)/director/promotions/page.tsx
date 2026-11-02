import { getPromotionEligibility } from "@/modules/promotions/services/promotions.service";
import { ATTENDANCE_THRESHOLD, GRADE_THRESHOLD } from "@/modules/promotions/eligibility";
import { FormButton } from "@/components/ui/FormButton";
import { promoteStudentAction } from "@/modules/promotions/actions";
import { LEVEL_LABELS } from "@/lib/level-labels";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilteredEmpty } from "@/components/ui/FilteredEmpty";
import { Pagination, Th, type SortContext } from "@/components/ui/TableControls";
import { matchesSearch } from "@/lib/search";
import { paginate, parseTableQuery, sortRows } from "@/lib/table";
import { parseFilters, type FilterField } from "@/lib/filters";
import { LEVEL_ORDER } from "@/lib/level-labels";

const BASE_PATH = "/director/promotions";

function Pill({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null)
    return <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{label} —</span>;
  return ok ? (
    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{label}</span>
  ) : (
    <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{label}</span>
  );
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  // La elegibilidad la calcula el servicio con los valores exactos y agregados en SQL. Antes esta página la
  // reimplementaba con los valores redondeados (79,5 % se veía como 80 % y mostraba "Promover" a quien el
  // servidor después rechazaba) y leía las filas de asistencia sin paginar (tope de 1000 filas).
  const rows = await getPromotionEligibility();

  const eligible = rows.filter((r) => r.isEligible).length;

  const query = parseTableQuery(sp, { sortable: ["student", "course", "attendance", "average", "status"], defaultSort: "student" });
  const courseNames = [...new Set(rows.map((r) => r.courseName))].sort((a, b) => a.localeCompare(b, "es"));
  const fields: FilterField[] = [
    { key: "curso", label: "Curso", type: "select", options: courseNames.map((n) => ({ value: n, label: n })) },
    { key: "nivel", label: "Nivel", type: "select", options: LEVEL_ORDER.map((l) => ({ value: l, label: LEVEL_LABELS[l] ?? l })) },
    {
      key: "estado",
      label: "Estado",
      type: "select",
      options: [
        { value: "apto", label: "Aptos para promover" },
        { value: "no", label: "No cumplen requisitos" },
      ],
    },
  ];
  const filters = parseFilters(sp, fields);
  const { q } = sp;
  let list = rows;
  if (q) list = list.filter((r) => matchesSearch(r.studentName, q) || matchesSearch(r.studentDni, q));
  if (filters.curso) list = list.filter((r) => r.courseName === filters.curso);
  if (filters.nivel) list = list.filter((r) => r.courseLevel === filters.nivel);
  if (filters.estado) list = list.filter((r) => r.isEligible === (filters.estado === "apto"));
  const sorted = sortRows(list, query, {
    student: (r) => r.studentName,
    course: (r) => r.courseName,
    attendance: (r) => r.attendancePct,
    average: (r) => r.gradeAvg,
    status: (r) => (r.isEligible ? 0 : 1),
  });
  const page = paginate(sorted, query);
  const hasFilters = Boolean(q) || Object.keys(filters).length > 0;
  const sort: SortContext = { basePath: BASE_PATH, searchParams: sp, query };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Promoción de alumnos</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Requisitos: asistencia ≥ {ATTENDANCE_THRESHOLD}% · promedio ≥ {GRADE_THRESHOLD.toFixed(1)} ·{" "}
          <span className="font-medium text-emerald-600">{eligible} alumno{eligible !== 1 ? "s" : ""} apto{eligible !== 1 ? "s" : ""}</span>
        </p>
      </div>

      {rows.length > 0 && (
        <>
          <SearchInput placeholder="Buscar por alumno o DNI..." resultCount={list.length} className="mb-3" />
          <FilterBar fields={fields} className="mb-4" />
        </>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay inscripciones activas.</p>
        </div>
      ) : hasFilters && list.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <FilteredEmpty clearHref={BASE_PATH} noun="alumno" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <Th plain label="Alumno" field="student" sort={sort} />
                <Th plain label="Curso" field="course" sort={sort} />
                <Th plain label="Asistencia" field="attendance" sort={sort} />
                <Th plain label="Promedio" field="average" sort={sort} />
                <Th plain label="Estado" field="status" sort={sort} />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {page.rows.map((r) => {
                const attendanceOk =
                  r.attendancePct !== null ? r.attendancePct >= ATTENDANCE_THRESHOLD : null;
                const gradesOk =
                  r.gradeAvg !== null ? r.gradeAvg >= GRADE_THRESHOLD : null;

                return (
                  <tr
                    key={r.enrollmentId}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{r.studentName}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.studentDni}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-700">{r.courseName}</p>
                      <p className="text-xs text-slate-400">{LEVEL_LABELS[r.courseLevel] ?? r.courseLevel}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Pill
                        ok={attendanceOk}
                        label={r.attendancePct !== null ? `${r.attendancePct}%` : "Sin datos"}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <Pill
                        ok={gradesOk}
                        label={r.gradeAvg !== null ? r.gradeAvg.toFixed(1) : "Sin datos"}
                      />
                    </td>
                    <td className="px-5 py-3">
                      {r.isEligible ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          Apto para promover
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                          No cumple requisitos
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.isEligible && (
                        <FormButton
                          action={promoteStudentAction}
                          fields={{ enrollmentId: r.enrollmentId }}
                          variant="primary"
                          size="sm"
                          confirmMessage={`¿Promover a ${r.studentName} en ${r.courseName}? Se marcará la inscripción como completada.`}
                        >
                          Promover
                        </FormButton>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 pb-4">
            <Pagination basePath={BASE_PATH} searchParams={sp} page={page} noun="inscripciones" nounSingular="inscripción" />
          </div>
        </div>
      )}
    </div>
  );
}
