import Link from "next/link";
import {
  getPromotionEligibility,
  ATTENDANCE_THRESHOLD,
  GRADE_THRESHOLD,
} from "@/modules/promotions/services/promotions.service";
import { FormButton } from "@/components/ui/FormButton";
import { promoteStudentAction } from "@/modules/promotions/actions";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  elementary: "Elementary",
  pre_intermediate: "Pre-Intermediate",
  intermediate: "Intermediate",
  upper_intermediate: "Upper-Intermediate",
  advanced: "Advanced",
};

function Pill({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null)
    return <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{label} —</span>;
  return ok ? (
    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{label}</span>
  ) : (
    <span className="text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{label}</span>
  );
}

export default async function PromotionsPage() {
  const rows = await getPromotionEligibility();
  const eligible = rows.filter((r) => r.isEligible).length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Promoción de alumnos</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Requisitos: asistencia ≥ {ATTENDANCE_THRESHOLD}% · promedio ≥ {GRADE_THRESHOLD.toFixed(1)} ·{" "}
          <span className="font-medium text-emerald-600">{eligible} alumno{eligible !== 1 ? "s" : ""} apto{eligible !== 1 ? "s" : ""}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay inscripciones activas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">Alumno</th>
                <th className="text-left px-5 py-3 font-medium">Curso</th>
                <th className="text-left px-5 py-3 font-medium">Asistencia</th>
                <th className="text-left px-5 py-3 font-medium">Promedio</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
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
        </div>
      )}
    </div>
  );
}
