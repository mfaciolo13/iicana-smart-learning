import Link from "next/link";
import { GraduationCap, BookOpen, UserCheck, CreditCard, AlertCircle, MessageSquare, DollarSign } from "lucide-react";
import { StatTile, StatTileSkeleton, type StatTileProps } from "@/components/ui/StatTile";
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
  const monthLabel = now
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  const kpis: StatTileProps[] = [
    { label: "Alumnos activos", value: activeStudents, sub: `${totalStudents} registrados`, icon: GraduationCap, href: "/director/students" },
    { label: "Cursos activos", value: activeCourses, sub: `${totalCourses} en total`, icon: BookOpen, href: "/director/courses" },
    { label: "Docentes", value: totalTeachers, sub: "En el sistema", icon: UserCheck, href: "/director/teachers" },
    {
      label: "Pagos pendientes",
      value: pendingPayments + overduePayments,
      sub: `${overduePayments} vencidos · ${pendingPayments} a vencer`,
      icon: overduePayments > 0 ? AlertCircle : CreditCard,
      tone: overduePayments > 0 ? "danger" : "warning",
      href: "/director/payments",
    },
    { label: "Ingresos del mes", value: formatARS(monthlyIncome), sub: monthLabel, icon: DollarSign, tone: "brand", compact: true, href: "/director/payments" },
    {
      label: "Reclamos abiertos",
      value: openComplaints,
      sub: openComplaints > 0 ? "Requieren atención" : "Sin pendientes",
      icon: MessageSquare,
      tone: openComplaints > 0 ? "warning" : "muted",
      href: "/director/complaints",
    },
  ];

  return (
    <>
      {(overduePayments > 0 || openComplaints > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">Requiere atención:</span>
          {overduePayments > 0 && (
            <Link href="/director/payments" className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-md hover:bg-red-200 transition-colors">
              {overduePayments} pago{overduePayments !== 1 ? "s" : ""} vencido{overduePayments !== 1 ? "s" : ""}
            </Link>
          )}
          {openComplaints > 0 && (
            <Link href="/director/complaints" className="text-xs font-semibold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-md hover:bg-amber-300 transition-colors">
              {openComplaints} reclamo{openComplaints !== 1 ? "s" : ""} abierto{openComplaints !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <StatTile key={kpi.label} {...kpi} />
        ))}
      </div>
    </>
  );
}

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatTileSkeleton key={i} />
      ))}
    </div>
  );
}
