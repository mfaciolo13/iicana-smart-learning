import { getYearEndReport } from "@/modules/year-end/services/year-end.service";
import { ATTENDANCE_THRESHOLD, GRADE_THRESHOLD } from "@/modules/promotions/services/promotions.service";
import { consolidateYearEndAction } from "@/modules/year-end/actions";
import { FormButton } from "@/components/ui/FormButton";
import { LEVEL_LABELS } from "@/lib/level-labels";

const OUTCOME_STYLE: Record<string, string> = {
  promoted: "text-emerald-700 bg-emerald-50",
  eligible: "text-blue-700 bg-blue-50",
  insufficient: "text-red-700 bg-red-50",
  withdrawn: "text-slate-500 bg-slate-100",
  no_data: "text-slate-400 bg-slate-50",
};

const OUTCOME_LABEL: Record<string, string> = {
  promoted: "Promovido",
  eligible: "Apto",
  insufficient: "Insuficiente",
  withdrawn: "Dado de baja",
  no_data: "Sin datos",
};

export default async function YearEndPage() {
  const { rows, summary } = await getYearEndReport();

  const hasPending = summary.eligible > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cierre de ciclo lectivo</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Umbral asistencia: {ATTENDANCE_THRESHOLD}% · Umbral nota: {GRADE_THRESHOLD}
          </p>
        </div>
        <FormButton
          action={consolidateYearEndAction}
          variant="primary"
          confirmMessage="¿Confirmar cierre? Se promoverán todos los alumnos aptos y se marcarán los egresados."
        >
          Cerrar ciclo lectivo
        </FormButton>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total", value: summary.total, style: "" },
          { label: "Promovidos", value: summary.promoted, style: "text-emerald-700" },
          { label: "Aptos", value: summary.eligible, style: "text-blue-700" },
          { label: "Insuficientes", value: summary.insufficient, style: "text-red-700" },
          { label: "Bajas", value: summary.withdrawn, style: "text-slate-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.style || "text-slate-900"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {hasPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-4 text-sm text-blue-800">
          Hay <strong>{summary.eligible}</strong> alumno(s) apto(s) pendientes de promoción. Usá el botón "Cerrar ciclo lectivo" para procesarlos.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay inscripciones registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">Alumno</th>
                <th className="text-left px-5 py-3 font-medium">Curso</th>
                <th className="text-left px-5 py-3 font-medium">Asistencia</th>
                <th className="text-left px-5 py-3 font-medium">Promedio</th>
                <th className="text-left px-5 py-3 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.enrollmentId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{r.studentName}</p>
                    <p className="text-xs text-slate-400">{r.studentDni}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <p>{r.courseName}</p>
                    <p className="text-xs text-slate-400">{LEVEL_LABELS[r.courseLevel] ?? r.courseLevel}</p>
                  </td>
                  <td className="px-5 py-3">
                    {r.attendancePct !== null ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.attendancePct >= ATTENDANCE_THRESHOLD
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {r.attendancePct}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {r.gradeAvg !== null ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.gradeAvg >= GRADE_THRESHOLD
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {r.gradeAvg}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        OUTCOME_STYLE[r.outcome] ?? ""
                      }`}
                    >
                      {OUTCOME_LABEL[r.outcome] ?? r.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
