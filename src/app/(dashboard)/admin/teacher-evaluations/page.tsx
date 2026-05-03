import Link from "next/link";
import { getTeacherEvalSummaries } from "@/modules/teacher-evaluations/services/teacher-evaluations.service";
import { buttonVariants } from "@/components/ui/Button";

function StarBar({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-slate-400">Sin datos</span>;
  const filled = Math.round(value);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-base ${s <= filled ? "text-amber-400" : "text-slate-200"}`}>★</span>
      ))}
      <span className="ml-1.5 text-xs font-medium text-slate-600">{Number(value).toFixed(1)}</span>
    </span>
  );
}

export default async function TeacherEvaluationsPage() {
  const summaries = await getTeacherEvalSummaries();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Evaluaciones docentes</h2>
          <p className="text-sm text-slate-400 mt-0.5">Informe consolidado de encuestas y observaciones</p>
        </div>
        <Link href="/admin/teacher-evaluations/new" className={buttonVariants({ variant: "primary" })}>
          + Registrar observación
        </Link>
      </div>

      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No hay docentes registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">Docente</th>
                <th className="text-left px-5 py-3 font-medium">Calificación promedio</th>
                <th className="text-left px-5 py-3 font-medium">Encuestas</th>
                <th className="text-left px-5 py-3 font-medium">Observaciones</th>
                <th className="text-left px-5 py-3 font-medium">Última obs.</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.teacherId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.teacherName}</td>
                  <td className="px-5 py-3"><StarBar value={s.avgRating} /></td>
                  <td className="px-5 py-3 text-slate-600">{s.surveyCount}</td>
                  <td className="px-5 py-3 text-slate-600">{s.observationCount}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {s.lastObservedAt
                      ? new Date(s.lastObservedAt).toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/teacher-evaluations/${s.teacherId}`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      Ver informe →
                    </Link>
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
