import { getAtRiskStudents } from "@/modules/notifications/services/risk-detection.service";
import { markIntervenedAction } from "@/modules/notifications/actions/risk.actions";
import { FormButton } from "@/components/ui/FormButton";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { ShieldAlert, CheckCircle } from "lucide-react";

const RISK_CONFIG: Record<string, { label: string; variant: "danger" | "warning" | "info" | "neutral" }> = {
  high: { label: "Alto", variant: "danger" },
  medium: { label: "Medio", variant: "warning" },
  low: { label: "Bajo", variant: "info" },
};

const SIGNAL_LABELS: Record<string, string> = {
  overdue: "Pagos vencidos",
  low_attendance: "Asistencia < 70%",
  low_assessment: "Promedio autoevaluaciones < 60%",
};

export default async function RiskPage() {
  const students = await getAtRiskStudents();

  const pending = students.filter((s) => !s.intervenedAt);
  const intervened = students.filter((s) => s.intervenedAt);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Riesgo de abandono</h2>
          <p className="text-sm text-slate-400 mt-0.5">Alumnos detectados con señales de posible abandono</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldAlert className="w-4 h-4" />
          <span>{pending.length} pendiente(s)</span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 mb-1">Sin alumnos en riesgo</p>
          <p className="text-xs text-slate-400">El análisis diario no detectó señales de abandono.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Pendientes de intervención</h3>
              <div className="space-y-3">
                {pending.map((s) => {
                  const risk = RISK_CONFIG[s.riskLevel] ?? { label: s.riskLevel, variant: "neutral" as const };
                  const signals = (s.signals as { type: string; detail: string }[]) ?? [];
                  return (
                    <div key={s.riskAssessmentId} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/director/students/${s.studentId}`} className="font-semibold text-slate-900 hover:text-brand-700 text-sm">
                              {s.studentName}
                            </Link>
                            <Badge variant={risk.variant}>{risk.label}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {signals.map((sig) => (
                              <span key={sig.type} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                                {SIGNAL_LABELS[sig.type] ?? sig.detail}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            Detectado: {new Date(s.assessedAt).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                        <FormButton
                          action={markIntervenedAction}
                          fields={{ riskAssessmentId: s.riskAssessmentId }}
                          variant="secondary"
                          size="sm"
                          confirmMessage={`¿Marcar como intervenido a ${s.studentName}?`}
                        >
                          Marcar intervenido
                        </FormButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {intervened.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-3">Intervenidos</h3>
              <div className="space-y-2">
                {intervened.map((s) => {
                  const risk = RISK_CONFIG[s.riskLevel] ?? { label: s.riskLevel, variant: "neutral" as const };
                  return (
                    <div key={s.riskAssessmentId} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <Link href={`/director/students/${s.studentId}`} className="text-sm font-medium text-slate-700 hover:text-brand-700">
                          {s.studentName}
                        </Link>
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                      </div>
                      <span className="text-xs text-slate-400">
                        Intervenido: {s.intervenedAt ? new Date(s.intervenedAt).toLocaleDateString("es-AR") : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
