import { createClient } from "@/lib/supabase/server";
import { FileSpreadsheet, CalendarCheck, Star, CreditCard } from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [{ data: attendanceRows }, { data: gradeRows }, { data: paymentRows }] = await Promise.all([
    supabase.from("attendance").select("status"),
    supabase.from("grades").select("score"),
    supabase.from("payments").select("status, amount"),
  ]);

  const totalAttendance = attendanceRows?.length ?? 0;
  const presentCount = (attendanceRows ?? []).filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const attendanceSummary = {
    totalRecords: totalAttendance,
    avgPct:
      totalAttendance > 0
        ? Math.round((presentCount / totalAttendance) * 100 * 10) / 10
        : 0,
  };

  const totalGrades = gradeRows?.length ?? 0;
  const gradeSum = (gradeRows ?? []).reduce((s, g) => s + parseFloat(g.score), 0);
  const passingGrades = (gradeRows ?? []).filter((g) => parseFloat(g.score) >= 7).length;
  const gradesSummary = {
    totalGrades,
    avgScore:
      totalGrades > 0
        ? (Math.round((gradeSum / totalGrades) * 100) / 100).toFixed(2)
        : "—",
    passing: passingGrades,
  };

  const paidPayments = (paymentRows ?? []).filter((p) => p.status === "paid");
  const pendingCount = (paymentRows ?? []).filter(
    (p) => p.status === "pending" || p.status === "overdue"
  ).length;
  const amountCollected = paidPayments
    .reduce((s, p) => s + parseFloat(p.amount), 0)
    .toString();
  const paymentsSummary = {
    totalPaid: paidPayments.length,
    totalPending: pendingCount,
    amountCollected,
  };

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

      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-700">Nota:</span> Los reportes se generan en tiempo real con los datos actuales del sistema.
          El archivo descargado es compatible con Microsoft Excel, Google Sheets y LibreOffice Calc.
        </p>
      </div>
    </div>
  );
}
