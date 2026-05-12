import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  GraduationCap,
  BookOpen,
  UserCheck,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Plus,
  CalendarCheck,
  PenLine,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import {
  getAttendanceAvgByCourse,
  getGradeAvgByCourse,
  getPaymentStatusCounts,
  getActiveStudentsByLevel,
} from "@/modules/reports/services/dashboard.service";
import { AttendanceChart } from "./components/AttendanceChart";
import { PaymentsDonut } from "./components/PaymentsDonut";
import { GradesChart } from "./components/GradesChart";
import { StudentsLevelChart } from "./components/StudentsLevelChart";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  function withTimeout<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
    return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
  }

  // REST calls first — always fast and critical for KPIs
  const [studentsRes, coursesRes, teachersRes, paymentsRes] = await Promise.all([
    supabase.from("students").select("id, status", { count: "exact", head: false }),
    supabase.from("courses").select("id, status", { count: "exact", head: false }),
    supabase.from("teachers").select("id", { count: "exact", head: false }),
    supabase.from("payments").select("id, status", { count: "exact", head: false }),
  ]);

  // Drizzle calls for charts — isolated: if they timeout the charts show empty state
  const [attendanceData, gradesData, paymentCounts, levelData] = await Promise.all([
    withTimeout(getAttendanceAvgByCourse(), []),
    withTimeout(getGradeAvgByCourse(), []),
    withTimeout(getPaymentStatusCounts(), []),
    withTimeout(getActiveStudentsByLevel(), []),
  ]);

  const totalStudents = studentsRes.count ?? 0;
  const activeStudents = studentsRes.data?.filter((s) => s.status === "active").length ?? 0;
  const totalCourses = coursesRes.count ?? 0;
  const activeCourses = coursesRes.data?.filter((c) => c.status === "active").length ?? 0;
  const totalTeachers = teachersRes.count ?? 0;
  const pendingPayments = paymentsRes.data?.filter((p) => p.status === "pending").length ?? 0;
  const overduePayments = paymentsRes.data?.filter((p) => p.status === "overdue").length ?? 0;

  const kpis = [
    {
      label: "Alumnos activos",
      value: activeStudents,
      sub: `${totalStudents} registrados en total`,
      icon: GraduationCap,
      bg: "bg-blue-50",
      text: "text-blue-700",
      href: "/admin/students",
    },
    {
      label: "Cursos activos",
      value: activeCourses,
      sub: `${totalCourses} cursos en total`,
      icon: BookOpen,
      bg: "bg-violet-50",
      text: "text-violet-700",
      href: "/admin/courses",
    },
    {
      label: "Docentes",
      value: totalTeachers,
      sub: "Registrados en el sistema",
      icon: UserCheck,
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      href: "/admin/teachers",
    },
    {
      label: "Pagos pendientes",
      value: pendingPayments + overduePayments,
      sub: `${overduePayments} vencidos · ${pendingPayments} a vencer`,
      icon: overduePayments > 0 ? AlertCircle : CreditCard,
      bg: overduePayments > 0 ? "bg-red-50" : "bg-amber-50",
      text: overduePayments > 0 ? "text-red-700" : "text-amber-700",
      href: "/admin/payments",
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
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen general del instituto</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${kpi.text}`} strokeWidth={2} />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
                <p className="text-xs sm:text-sm font-medium text-slate-700 mt-0.5">{kpi.label}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions + cycle status */}
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

        <div
          className="rounded-2xl p-5 text-white flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-white/70" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Estado del ciclo</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}%
            </p>
            <p className="text-sm text-white/70">de alumnos activos</p>
          </div>
          <div className="space-y-2.5 mt-6">
            {[
              { label: "Alumnos activos", value: activeStudents, total: totalStudents },
              { label: "Cursos activos", value: activeCourses, total: totalCourses },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-white/70 mb-1">
                  <span>{item.label}</span>
                  <span>{item.value}/{item.total}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/60 rounded-full transition-all"
                    style={{ width: item.total > 0 ? `${(item.value / item.total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Asistencia por curso</h2>
            <Link href="/admin/attendance" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">% de presentes sobre el total de clases registradas</p>
          <AttendanceChart data={attendanceData} />
          <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥ 80%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> 60–79%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &lt; 60%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Estado de pagos</h2>
            <Link href="/admin/payments" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-2">Distribución de cuotas</p>
          <PaymentsDonut data={paymentCounts} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Nota promedio por curso</h2>
            <Link href="/admin/grades" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">Promedio de todas las evaluaciones · línea verde = mínimo aprobación (7)</p>
          <GradesChart data={gradesData} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Alumnos por nivel</h2>
            <Link href="/admin/students" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">Alumnos activos agrupados por nivel de inglés</p>
          <StudentsLevelChart data={levelData} />
        </div>
      </div>

    </div>
  );
}
