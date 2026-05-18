import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerProfile } from "@/lib/auth/helpers";
import {
  GraduationCap,
  BookOpen,
  UserCheck,
  CreditCard,
  ArrowRight,
  Plus,
  CalendarCheck,
  PenLine,
  BarChart2,
  AlertCircle,
  MessageSquare,
  DollarSign,
  UserPlus,
} from "lucide-react";
import { DashboardCharts } from "./components/DashboardCharts";
import {
  getRecentEnrollments,
  getRecentPayments,
} from "@/modules/reports/services/dashboard.service";

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

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const profile = await getServerProfile();

  // Phase 1: all independent queries in parallel
  const [studentsRes, coursesRes, teachersRes, paymentsRes, complaintsRes, recentEnrollments, recentPayments] =
    await Promise.all([
      supabase.from("students").select("id, status"),
      supabase.from("courses").select("id, name, level, status"),
      supabase.from("teachers").select("id"),
      supabase.from("payments").select("id, status, amount, paid_at"),
      supabase.from("complaints").select("id, status"),
      getRecentEnrollments(),
      getRecentPayments(),
    ]);

  const activeStudents = (studentsRes.data ?? []).filter((s) => s.status === "active").length;
  const totalStudents = studentsRes.data?.length ?? 0;
  const activeCourses = (coursesRes.data ?? []).filter((c) => c.status === "active").length;
  const totalCourses = coursesRes.data?.length ?? 0;
  const totalTeachers = teachersRes.data?.length ?? 0;
  const pendingPayments = (paymentsRes.data ?? []).filter((p) => p.status === "pending").length;
  const overduePayments = (paymentsRes.data ?? []).filter((p) => p.status === "overdue").length;
  const openComplaints = (complaintsRes.data ?? []).filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;

  // Monthly income: paid payments with paid_at in current calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyIncome = (paymentsRes.data ?? [])
    .filter((p) => p.status === "paid" && p.paid_at && p.paid_at >= monthStart)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Payment status counts for donut chart — reuse existing data
  const paymentStatusMap = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    paymentStatusMap.set(p.status, (paymentStatusMap.get(p.status) ?? 0) + 1);
  }
  const paymentCounts = [...paymentStatusMap.entries()].map(([status, count]) => ({ status, count }));

  // Active course IDs and lookup maps for chart computation
  const activeCourseRows = (coursesRes.data ?? []).filter((c) => c.status === "active");
  const activeCourseIds = activeCourseRows.map((c) => c.id);
  const activeCourseMap = new Map(activeCourseRows.map((c) => [c.id, { name: c.name, level: c.level }]));

  // Phase 2: Enrollments for active courses (depends on activeCourseIds)
  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("id, student_id, course_id, status")
    .in("course_id", activeCourseIds);

  const enrollmentIds = (enrollmentRows ?? []).map((e) => e.id);
  const enrollmentToCourse = new Map((enrollmentRows ?? []).map((e) => [e.id, e.course_id]));

  // Phase 3: Attendance + grades for chart computation (parallel)
  const [{ data: attRows }, { data: gradeRows }] = await Promise.all([
    enrollmentIds.length > 0
      ? supabase.from("attendance").select("enrollment_id, status").in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [] }),
    enrollmentIds.length > 0
      ? supabase.from("grades").select("enrollment_id, score").in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Attendance chart — % present per active course
  const courseAttStats = new Map<string, { total: number; present: number }>();
  for (const a of attRows ?? []) {
    const courseId = enrollmentToCourse.get(a.enrollment_id);
    if (!courseId) continue;
    const cur = courseAttStats.get(courseId) ?? { total: 0, present: 0 };
    cur.total++;
    if (a.status === "present" || a.status === "late") cur.present++;
    courseAttStats.set(courseId, cur);
  }
  const attendanceData = [...courseAttStats.entries()]
    .filter(([, s]) => s.total > 0)
    .map(([courseId, s]) => ({
      courseName: activeCourseMap.get(courseId)?.name ?? "",
      level: activeCourseMap.get(courseId)?.level ?? "",
      pct: Math.round((s.present / s.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  // Grades chart — avg score per active course
  const courseGradeStats = new Map<string, { sum: number; count: number }>();
  for (const g of gradeRows ?? []) {
    const courseId = enrollmentToCourse.get(g.enrollment_id);
    if (!courseId) continue;
    const cur = courseGradeStats.get(courseId) ?? { sum: 0, count: 0 };
    cur.sum += parseFloat(g.score);
    cur.count++;
    courseGradeStats.set(courseId, cur);
  }
  const gradesData = [...courseGradeStats.entries()]
    .filter(([, s]) => s.count > 0)
    .map(([courseId, s]) => ({
      courseName: activeCourseMap.get(courseId)?.name ?? "",
      level: activeCourseMap.get(courseId)?.level ?? "",
      avg: Math.round((s.sum / s.count) * 10) / 10,
    }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName))
    .slice(0, 8);

  // Students by level chart — distinct active students per level in active courses
  const levelStudents = new Map<string, Set<string>>();
  for (const e of enrollmentRows ?? []) {
    if (e.status !== "active") continue;
    const course = activeCourseMap.get(e.course_id);
    if (!course) continue;
    const set = levelStudents.get(course.level) ?? new Set<string>();
    set.add(e.student_id);
    levelStudents.set(course.level, set);
  }
  const levelData = [...levelStudents.entries()].map(([level, students]) => ({
    level,
    count: students.size,
  }));

  // Header: greeting + formatted date
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile?.full_name?.split(" ")[0] ?? "Administrador";
  const dateStr = now.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Activity feed — merge enrollments + payments, sort by recency
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

  const kpis = [
    {
      label: "Alumnos activos",
      value: String(activeStudents),
      sub: `${totalStudents} registrados`,
      icon: GraduationCap,
      bg: "bg-blue-50",
      text: "text-blue-700",
      href: "/admin/students",
    },
    {
      label: "Cursos activos",
      value: String(activeCourses),
      sub: `${totalCourses} en total`,
      icon: BookOpen,
      bg: "bg-violet-50",
      text: "text-violet-700",
      href: "/admin/courses",
    },
    {
      label: "Docentes",
      value: String(totalTeachers),
      sub: "En el sistema",
      icon: UserCheck,
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      href: "/admin/teachers",
    },
    {
      label: "Pagos pendientes",
      value: String(pendingPayments + overduePayments),
      sub: `${overduePayments} vencidos · ${pendingPayments} a vencer`,
      icon: overduePayments > 0 ? AlertCircle : CreditCard,
      bg: overduePayments > 0 ? "bg-red-50" : "bg-amber-50",
      text: overduePayments > 0 ? "text-red-700" : "text-amber-700",
      href: "/admin/payments",
    },
    {
      label: "Ingresos del mes",
      value: formatARS(monthlyIncome),
      sub: now.toLocaleDateString("es-AR", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase()),
      icon: DollarSign,
      bg: "bg-teal-50",
      text: "text-teal-700",
      href: "/admin/payments",
      compact: true,
    },
    {
      label: "Reclamos abiertos",
      value: String(openComplaints),
      sub: openComplaints > 0 ? "Requieren atención" : "Sin pendientes",
      icon: MessageSquare,
      bg: openComplaints > 0 ? "bg-orange-50" : "bg-slate-50",
      text: openComplaints > 0 ? "text-orange-700" : "text-slate-400",
      href: "/admin/complaints",
    },
  ];

  const quickActions = [
    { label: "Nuevo alumno", href: "/admin/students/new", icon: Plus, desc: "Registrar un alumno" },
    { label: "Nuevo curso", href: "/admin/courses/new", icon: BookOpen, desc: "Crear curso" },
    { label: "Asistencia", href: "/admin/attendance", icon: CalendarCheck, desc: "Registrar clase" },
    { label: "Cargar notas", href: "/admin/grades", icon: PenLine, desc: "Ingresar notas" },
    { label: "Registrar pago", href: "/admin/payments/new", icon: CreditCard, desc: "Cobrar cuota" },
    { label: "Reportes", href: "/admin/reports", icon: BarChart2, desc: "Ver estadísticas" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <p className="text-sm text-slate-400">{dateFormatted}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{greeting}, {firstName}</h1>
      </div>

      {/* Alert band — only when there are urgent items */}
      {(overduePayments > 0 || openComplaints > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">Requiere atención:</span>
          {overduePayments > 0 && (
            <Link
              href="/admin/payments"
              className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full hover:bg-red-200 transition-colors"
            >
              {overduePayments} pago{overduePayments !== 1 ? "s" : ""} vencido{overduePayments !== 1 ? "s" : ""}
            </Link>
          )}
          {openComplaints > 0 && (
            <Link
              href="/admin/complaints"
              className="text-xs font-semibold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-300 transition-colors"
            >
              {openComplaints} reclamo{openComplaints !== 1 ? "s" : ""} abierto{openComplaints !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      {/* KPI cards — 6 cards in responsive grid */}
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
                <p className={`font-bold text-slate-900 leading-tight ${kpi.compact ? "text-base" : "text-2xl"}`}>
                  {kpi.value}
                </p>
                <p className="text-xs font-medium text-slate-700 mt-0.5 leading-tight">{kpi.label}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{kpi.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col gap-2 p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                >
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">{action.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Actividad reciente</h2>
          {activityItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Sin actividad reciente</p>
          ) : (
            <div className="space-y-3.5">
              {activityItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      item.type === "enrollment" ? "bg-blue-50" : "bg-emerald-50"
                    }`}
                  >
                    {item.type === "enrollment" ? (
                      <UserPlus className="w-3.5 h-3.5 text-blue-600" />
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
      </div>

      <DashboardCharts
        attendanceData={attendanceData}
        gradesData={gradesData}
        levelData={levelData}
        paymentCounts={paymentCounts}
      />

    </div>
  );
}
