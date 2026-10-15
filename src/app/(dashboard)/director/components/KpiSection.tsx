import Link from "next/link";
import { GraduationCap, BookOpen, UserCheck, CreditCard, ArrowRight, AlertCircle, MessageSquare, DollarSign } from "lucide-react";
import { getDashboardCounts } from "@/modules/reports/services/dashboard.service";
import { getPaymentSummary } from "@/modules/payments/services/payments.service";
import { countOpenComplaints } from "@/modules/complaints/services/complaints.service";

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Banda de alertas + tarjetas de números del director. Carga aparte del resto del panel. */
export async function KpiSection() {
  // Las consultas van en serie: la conexión de Drizzle atiende una por vez (SCRUM-270).
  const counts = await getDashboardCounts();
  const paymentSummary = await getPaymentSummary();
  const openComplaints = await countOpenComplaints();

  const { activeStudents, totalStudents, activeCourses, totalCourses, totalTeachers, monthlyIncome } = counts;
  const pendingPayments = paymentSummary.pending;
  const overduePayments = paymentSummary.overdue;
  const now = new Date();

  const kpis = [
    { label: "Alumnos activos", value: String(activeStudents), sub: `${totalStudents} registrados`, icon: GraduationCap, bg: "bg-blue-50", text: "text-blue-700", href: "/director/students" },
    { label: "Cursos activos", value: String(activeCourses), sub: `${totalCourses} en total`, icon: BookOpen, bg: "bg-violet-50", text: "text-violet-700", href: "/director/courses" },
    { label: "Docentes", value: String(totalTeachers), sub: "En el sistema", icon: UserCheck, bg: "bg-emerald-50", text: "text-emerald-700", href: "/director/teachers" },
    {
      label: "Pagos pendientes",
      value: String(pendingPayments + overduePayments),
      sub: `${overduePayments} vencidos · ${pendingPayments} a vencer`,
      icon: overduePayments > 0 ? AlertCircle : CreditCard,
      bg: overduePayments > 0 ? "bg-red-50" : "bg-amber-50",
      text: overduePayments > 0 ? "text-red-700" : "text-amber-700",
      href: "/director/payments",
    },
    {
      label: "Ingresos del mes",
      value: formatARS(monthlyIncome),
      sub: now.toLocaleDateString("es-AR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase()),
      icon: DollarSign,
      bg: "bg-teal-50",
      text: "text-teal-700",
      href: "/director/payments",
      compact: true,
    },
    {
      label: "Reclamos abiertos",
      value: String(openComplaints),
      sub: openComplaints > 0 ? "Requieren atención" : "Sin pendientes",
      icon: MessageSquare,
      bg: openComplaints > 0 ? "bg-orange-50" : "bg-slate-50",
      text: openComplaints > 0 ? "text-orange-700" : "text-slate-400",
      href: "/director/complaints",
    },
  ];

  return (
    <>
      {(overduePayments > 0 || openComplaints > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">Requiere atención:</span>
          {overduePayments > 0 && (
            <Link href="/director/payments" className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full hover:bg-red-200 transition-colors">
              {overduePayments} pago{overduePayments !== 1 ? "s" : ""} vencido{overduePayments !== 1 ? "s" : ""}
            </Link>
          )}
          {openComplaints > 0 && (
            <Link href="/director/complaints" className="text-xs font-semibold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-300 transition-colors">
              {openComplaints} reclamo{openComplaints !== 1 ? "s" : ""} abierto{openComplaints !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-2.5">
                <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${kpi.text}`} strokeWidth={2} />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-0.5" />
              </div>
              <div>
                <p className={`font-bold text-slate-900 leading-tight ${kpi.compact ? "text-base" : "text-2xl"}`}>{kpi.value}</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5 leading-tight">{kpi.label}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{kpi.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm animate-pulse h-[108px]">
          <div className="w-8 h-8 rounded-xl bg-slate-100 mb-3" />
          <div className="h-5 w-12 bg-slate-100 rounded mb-2" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}
