import { Suspense } from "react";
import { getReportsSummary } from "@/modules/reports/services/dashboard.service";
import { ChartSkeleton } from "@/components/charts/ChartCard";
import { FinancePanel } from "@/components/analytics/FinancePanel";
import { DelinquencySection } from "@/components/analytics/DelinquencySection";
import { FileSpreadsheet, CalendarCheck, Star, CreditCard } from "lucide-react";

export default async function ReportsPage() {
  // Resumen calculado en SQL: PostgREST corta en 1000 filas (SCRUM-283).
  const summary = await getReportsSummary();
  const attendanceSummary = summary.attendance;
  const gradesSummary = summary.grades;
  const paymentsSummary = summary.payments;

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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-400 mt-0.5">Exportá los datos del instituto en formato Excel</p>
      </div>

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

      <div className="mt-8 space-y-5">
        <Suspense fallback={<ChartSkeleton />}>
          <FinancePanel paymentsHref="/administrativo/payments" />
        </Suspense>
        <Suspense fallback={<ChartSkeleton height={160} />}>
          <DelinquencySection studentsHref="/administrativo/students" />
        </Suspense>
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
