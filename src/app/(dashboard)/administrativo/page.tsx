import { StatTile, type StatTileProps } from "@/components/ui/StatTile";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerProfile } from "@/lib/auth/helpers";
import { hourInstitute } from "@/lib/format";
import {
  GraduationCap,
  ClipboardList,
  CreditCard,
  AlertCircle,
  Plus,
  CalendarCheck,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import {
  getRecentEnrollments,
  getRecentPayments,
  getDashboardCounts,
} from "@/modules/reports/services/dashboard.service";
import { getPaymentSummary } from "@/modules/payments/services/payments.service";
import { countOpenComplaints } from "@/modules/complaints/services/complaints.service";
import { ChartSkeleton } from "@/components/charts/ChartCard";
import { FinancePanel } from "@/components/analytics/FinancePanel";
import { AcademicPanel } from "@/components/analytics/AcademicPanel";
import { PeoplePanel } from "@/components/analytics/PeoplePanel";
import { QualityPanel } from "@/components/analytics/QualityPanel";

function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  if (diffMins < 2) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default async function AdministrativoDashboardPage() {
  const supabase = await createClient();
  const profile = await getServerProfile();

  // Contadores en SQL (Drizzle), con el mismo criterio de pendiente/vencido que Pagos (SCRUM-283, SCRUM-285).
  // En serie: la conexión de Drizzle atiende una consulta por vez (SCRUM-270).
  const counts = await getDashboardCounts();
  const paymentSummary = await getPaymentSummary();
  const openComplaints = await countOpenComplaints();
  const enrollmentsRes = await supabase
    .from("enrollments")
    .select("id, status, enrolled_at")
    .order("enrolled_at", { ascending: false })
    .limit(5);
  const recentEnrollments = await getRecentEnrollments();
  const recentPayments = await getRecentPayments();

  const { activeStudents, totalStudents } = counts;
  const pendingPayments = paymentSummary.pending;
  const overduePayments = paymentSummary.overdue;
  const recentEnrollmentCount = (enrollmentsRes.data ?? []).filter(
    (e) => e.status === "active"
  ).length;

  const now = new Date();
  const hour = hourInstitute(now);
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile?.full_name?.split(" ")[0] ?? "Administrativo";
  const dateStr = now.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Cordoba",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const activityItems = [
    ...recentEnrollments.map((e) => ({
      id: `enroll-${e.id}`,
      type: "enrollment" as const,
      label: `${e.studentName} inscripto en ${e.courseName}`,
      timestamp: e.enrolledAt,
    })),
    ...recentPayments.map((p) => ({
      id: `pay-${p.id}`,
      type: "payment" as const,
      label: `Pago ${p.studentName} — ${formatARS(parseFloat(p.amount))}`,
      timestamp: p.paidAt,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  const kpis: StatTileProps[] = [
    { label: "Alumnos activos", value: activeStudents, sub: `${totalStudents} registrados`, icon: GraduationCap, href: "/administrativo/students" },
    { label: "Inscripciones recientes", value: recentEnrollmentCount, sub: "Últimas 5 inscripciones activas", icon: ClipboardList, href: "/administrativo/enrollments" },
    {
      label: "Pagos pendientes",
      value: pendingPayments + overduePayments,
      sub: `${overduePayments} vencidos · ${pendingPayments} a vencer`,
      icon: overduePayments > 0 ? AlertCircle : CreditCard,
      tone: overduePayments > 0 ? "danger" : "warning",
      href: "/administrativo/payments",
    },
    {
      label: "Reclamos abiertos",
      value: openComplaints,
      sub: openComplaints > 0 ? "Requieren atención" : "Sin pendientes",
      icon: MessageSquare,
      tone: openComplaints > 0 ? "warning" : "muted",
      href: "/administrativo/complaints",
    },
  ];

  const quickActions = [
    { label: "Nuevo alumno", href: "/administrativo/students/new", icon: Plus, desc: "Registrar un alumno" },
    { label: "Nueva inscripción", href: "/administrativo/enrollments/new", icon: ClipboardList, desc: "Inscribir en curso" },
    { label: "Asistencia", href: "/administrativo/attendance", icon: CalendarCheck, desc: "Registrar clase" },
    { label: "Registrar pago", href: "/administrativo/payments/new", icon: CreditCard, desc: "Cobrar cuota" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <p className="text-sm text-slate-400">{dateFormatted}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{greeting}, {firstName}</h1>
      </div>

      {/* Alert band */}
      {(overduePayments > 0 || openComplaints > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">Requiere atención:</span>
          {overduePayments > 0 && (
            <Link
              href="/administrativo/payments"
              className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full hover:bg-red-200 transition-colors"
            >
              {overduePayments} pago{overduePayments !== 1 ? "s" : ""} vencido{overduePayments !== 1 ? "s" : ""}
            </Link>
          )}
          {openComplaints > 0 && (
            <Link
              href="/administrativo/complaints"
              className="text-xs font-semibold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-300 transition-colors"
            >
              {openComplaints} reclamo{openComplaints !== 1 ? "s" : ""} abierto{openComplaints !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <StatTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-brand-200 hover:bg-brand-50/50 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-brand-100 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4.5 h-4.5 text-slate-500 group-hover:text-brand-600 transition-colors" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 truncate">{action.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Activity feed */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Actividad reciente</h2>
        {activityItems.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Sin actividad reciente</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === "enrollment" ? "bg-brand-50" : "bg-emerald-50"
                  }`}
                >
                  {item.type === "enrollment" ? (
                    <UserPlus className="w-3.5 h-3.5 text-brand-600" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-snug">{item.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <h2 className="text-base font-semibold text-slate-900">Cobranza</h2>
        <p className="text-xs text-slate-400">Facturado y cobrado de los últimos 6 meses, y deuda por antigüedad</p>
      </div>
      <Suspense fallback={<ChartSkeleton />}>
        <FinancePanel paymentsHref="/administrativo/payments" />
      </Suspense>

      <div className="pt-2">
        <h2 className="text-base font-semibold text-slate-900">Alumnos y cursos</h2>
        <p className="text-xs text-slate-400">Inscripciones, asistencia y ocupación de cursos</p>
      </div>
      <Suspense fallback={<ChartSkeleton />}>
        <PeoplePanel parts={["enrollments", "status"]} studentsHref="/administrativo/students" />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <AcademicPanel parts={["attendance", "occupancy"]} coursesHref="/administrativo/courses" />
      </Suspense>

      <div className="pt-2">
        <h2 className="text-base font-semibold text-slate-900">Atención</h2>
        <p className="text-xs text-slate-400">Estado de los reclamos de alumnos</p>
      </div>
      <Suspense fallback={<ChartSkeleton />}>
        <QualityPanel parts={["complaints"]} complaintsHref="/administrativo/complaints" />
      </Suspense>
    </div>
  );
}
