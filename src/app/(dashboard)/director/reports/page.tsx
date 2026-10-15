import { Suspense } from "react";
import { getReportsSummary } from "@/modules/reports/services/dashboard.service";
import { ChartSkeleton } from "@/components/charts/ChartCard";
import { FinancePanel } from "@/components/analytics/FinancePanel";
import { AcademicPanel } from "@/components/analytics/AcademicPanel";
import { DelinquencySection } from "@/components/analytics/DelinquencySection";
import { FileSpreadsheet, CalendarCheck, Star, CreditCard, Stethoscope, TrendingUp } from "lucide-react";
import {
  getRiskBreakdown,
  getAttendanceGradeCorrelation,
  getPaymentTrend,
  getRiskTrend,
} from "@/modules/reports/services/insights.service";

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

function monthLabel(ym: string) {
  const [, m] = ym.split("-");
  return MONTH_LABELS[m] ?? ym;
}

export default async function ReportsPage() {
  // Resumen calculado en SQL: PostgREST corta en 1000 filas (SCRUM-283).
  const summary = await getReportsSummary();
  const attendanceSummary = summary.attendance;
  const gradesSummary = summary.grades;
  const paymentsSummary = summary.payments;

  const riskBreakdown = await getRiskBreakdown();
  const correlation = await getAttendanceGradeCorrelation();
  const paymentTrend = await getPaymentTrend();
  const riskTrend = await getRiskTrend();

  const reports = [
    {
      title: "Asistencia",
      description: "Resumen de presencia por alumno y curso: total de clases, presentes, ausentes, tardanzas y porcentaje.",
      icon: CalendarCheck,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/api/reports/attendance",
      filename: "reporte-asistencia.xlsx",
      stats: [
        { label: "Registros", value: attendanceSummary.totalRecords },
        { label: "Asistencia media", value: `${attendanceSummary.avgPct}%` },
      ],
    },
    {
      title: "Notas",
      description: "Listado completo de evaluaciones: tipo, nota, fecha y estado de aprobación por alumno y curso.",
      icon: Star,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      href: "/api/reports/grades",
      filename: "reporte-notas.xlsx",
      stats: [
        { label: "Evaluaciones", value: gradesSummary.totalGrades },
        { label: "Promedio general", value: gradesSummary.avgScore },
        { label: "Aprobadas", value: gradesSummary.passing },
      ],
    },
    {
      title: "Pagos",
      description: "Estado de pagos por alumno: monto, vencimiento, fecha de pago, método y número de recibo.",
      icon: CreditCard,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/api/reports/payments",
      filename: "reporte-pagos.xlsx",
      stats: [
        { label: "Pagados", value: paymentsSummary.totalPaid },
        { label: "Pendientes", value: paymentsSummary.totalPending },
        {
          label: "Recaudado",
          value: `$${parseFloat(paymentsSummary.amountCollected).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`,
        },
      ],
    },
  ];

  const maxSignal = Math.max(
    riskBreakdown.bySignal.overdue,
    riskBreakdown.bySignal.lowAttendance,
    riskBreakdown.bySignal.lowAssessment,
    1
  );
  const maxMonth = Math.max(...paymentTrend.months.map((m) => m.total), paymentTrend.projectedNextMonth, 1);
  const maxRiskPoint = Math.max(...riskTrend.points.map((p) => p.atRisk), riskTrend.projectedNext ?? 0, 1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-400 mt-0.5">Exportá los datos del instituto en formato Excel</p>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">1. Descriptivo — qué pasó</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.title}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${report.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${report.iconColor}`} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{report.title}</h3>
                  <div className="flex gap-3 mt-0.5">
                    {report.stats.map((s) => (
                      <span key={s.label} className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{s.value}</span> {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-500 leading-relaxed flex-1">{report.description}</p>

              {/* Download button */}
              <a
                href={report.href}
                download={report.filename}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-brand-700 text-brand-700 text-sm font-semibold hover:bg-brand-700 hover:text-white transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </a>
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3 mt-10">Tendencias — últimos 6 meses</h3>
      <div className="space-y-5">
        <Suspense fallback={<ChartSkeleton />}>
          <FinancePanel paymentsHref="/director/payments" />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <AcademicPanel parts={["attendance", "grades"]} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton height={160} />}>
          <DelinquencySection studentsHref="/director/students" />
        </Suspense>
      </div>

      {/* ─── Diagnóstico: por qué pasa ────────────────────────────────── */}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3 mt-10">2. Diagnóstico — por qué pasa</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-amber-600" strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">Causas del riesgo de abandono</h4>
              <p className="text-xs text-slate-400">{riskBreakdown.totalAtRisk} alumnos en riesgo (bajo/medio/alto)</p>
            </div>
          </div>

          {riskBreakdown.totalAtRisk === 0 ? (
            <p className="text-sm text-slate-400">No hay alumnos en riesgo según la última corrida del detector.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Pagos vencidos", value: riskBreakdown.bySignal.overdue },
                { label: "Asistencia baja (<70%)", value: riskBreakdown.bySignal.lowAttendance },
                { label: "Bajo rendimiento (<60%)", value: riskBreakdown.bySignal.lowAssessment },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{s.label}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(s.value / maxSignal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-1">
                Señal más frecuente:{" "}
                <span className="font-semibold text-slate-600">
                  {riskBreakdown.bySignal.overdue >= riskBreakdown.bySignal.lowAttendance && riskBreakdown.bySignal.overdue >= riskBreakdown.bySignal.lowAssessment
                    ? "pagos vencidos"
                    : riskBreakdown.bySignal.lowAttendance >= riskBreakdown.bySignal.lowAssessment
                    ? "asistencia baja"
                    : "bajo rendimiento"}
                </span>
                {" "}— ahí conviene enfocar la intervención.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-indigo-600" strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">Asistencia vs. rendimiento</h4>
              <p className="text-xs text-slate-400">¿la asistencia baja realmente se traduce en notas más bajas?</p>
            </div>
          </div>

          {correlation.lowAttendanceAvgGrade === null && correlation.highAttendanceAvgGrade === null ? (
            <p className="text-sm text-slate-400">Todavía no hay suficientes datos de notas y asistencia cruzados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
                <p className="text-xs text-red-600 font-medium mb-1">Asistencia &lt; 70%</p>
                <p className="text-2xl font-bold text-red-700">{correlation.lowAttendanceAvgGrade ?? "—"}</p>
                <p className="text-xs text-red-400 mt-1">{correlation.lowAttendanceCount} inscripciones</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium mb-1">Asistencia ≥ 70%</p>
                <p className="text-2xl font-bold text-emerald-700">{correlation.highAttendanceAvgGrade ?? "—"}</p>
                <p className="text-xs text-emerald-400 mt-1">{correlation.highAttendanceCount} inscripciones</p>
              </div>
              {correlation.lowAttendanceAvgGrade !== null && correlation.highAttendanceAvgGrade !== null && (
                <p className="col-span-2 text-xs text-slate-400 pt-1">
                  Diferencia de {Math.abs(Math.round((correlation.highAttendanceAvgGrade - correlation.lowAttendanceAvgGrade) * 100) / 100)} puntos
                  {" "}entre ambos grupos — {correlation.highAttendanceAvgGrade > correlation.lowAttendanceAvgGrade ? "confirma" : "no confirma"} la correlación esperada.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Predictivo: hacia dónde va ───────────────────────────────── */}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3 mt-10">3. Predictivo — hacia dónde va</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={2} />
            </div>
            <h4 className="text-base font-semibold text-slate-900">Proyección de recaudación</h4>
          </div>

          {paymentTrend.months.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay pagos cobrados para proyectar una tendencia.</p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-24 mb-3">
                {paymentTrend.months.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className="w-full bg-emerald-400 rounded-t"
                      style={{ height: `${Math.max((m.total / maxMonth) * 100, 4)}%` }}
                    />
                    <span className="text-[10px] text-slate-400">{monthLabel(m.month)}</span>
                  </div>
                ))}
                <div className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full bg-emerald-200 border-2 border-dashed border-emerald-500 rounded-t"
                    style={{ height: `${Math.max((paymentTrend.projectedNextMonth / maxMonth) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] text-emerald-600 font-semibold">Próx.</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Proyección próximo mes: <span className="font-bold text-emerald-700">{formatARS(paymentTrend.projectedNextMonth)}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Regresión lineal sobre {paymentTrend.months.length === 1 ? "el último mes cobrado" : `los últimos ${paymentTrend.months.length} meses cobrados`}.
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-rose-600" strokeWidth={2} />
            </div>
            <h4 className="text-base font-semibold text-slate-900">Proyección de alumnos en riesgo</h4>
          </div>

          {!riskTrend.hasEnoughHistory ? (
            <p className="text-sm text-slate-400">
              Se necesitan al menos 2 corridas del detector de riesgo en fechas distintas para proyectar una tendencia
              (hoy hay {riskTrend.points.length}). El cron corre una vez por día — en un par de días va a haber
              suficiente historial.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-24 mb-3">
                {riskTrend.points.map((p) => (
                  <div key={p.date} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className="w-full bg-rose-400 rounded-t"
                      style={{ height: `${Math.max((p.atRisk / maxRiskPoint) * 100, 4)}%` }}
                    />
                    <span className="text-[10px] text-slate-400">{p.date.slice(5)}</span>
                  </div>
                ))}
                <div className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full bg-rose-200 border-2 border-dashed border-rose-500 rounded-t"
                    style={{ height: `${Math.max(((riskTrend.projectedNext ?? 0) / maxRiskPoint) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] text-rose-600 font-semibold">Próx.</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Proyección: <span className="font-bold text-rose-700">{riskTrend.projectedNext} alumnos en riesgo</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-700">Nota:</span> Los reportes se generan en tiempo real con los datos actuales del sistema.
          El archivo descargado es compatible con Microsoft Excel, Google Sheets y LibreOffice Calc.
        </p>
      </div>
    </div>
  );
}
