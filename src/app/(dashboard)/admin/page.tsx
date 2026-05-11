import Link from "next/link";
import { db } from "@/lib/drizzle";
import { students, courses, teachers, payments } from "@/lib/drizzle/schema";
import { sql } from "drizzle-orm";
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
} from "lucide-react";

export default async function AdminDashboardPage() {
  const [studentStats, courseStats, teacherCount, paymentStats] = await Promise.all([
    db.select({
      total: sql<number>`cast(count(*) as int)`,
      active: sql<number>`cast(sum(case when ${students.status} = 'active' then 1 else 0 end) as int)`,
    }).from(students),
    db.select({
      total: sql<number>`cast(count(*) as int)`,
      active: sql<number>`cast(sum(case when ${courses.status} = 'active' then 1 else 0 end) as int)`,
    }).from(courses),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(teachers),
    db.select({
      pending: sql<number>`cast(sum(case when ${payments.status} = 'pending' then 1 else 0 end) as int)`,
      overdue: sql<number>`cast(sum(case when ${payments.status} = 'overdue' then 1 else 0 end) as int)`,
    }).from(payments),
  ]);

  const totalStudents = studentStats[0]?.total ?? 0;
  const activeStudents = studentStats[0]?.active ?? 0;
  const totalCourses = courseStats[0]?.total ?? 0;
  const activeCourses = courseStats[0]?.active ?? 0;
  const totalTeachers = teacherCount[0]?.count ?? 0;
  const pendingPayments = paymentStats[0]?.pending ?? 0;
  const overduePayments = paymentStats[0]?.overdue ?? 0;

  const kpis = [
    {
      label: "Alumnos activos",
      value: activeStudents,
      sub: `${totalStudents} registrados en total`,
      icon: GraduationCap,
      gradient: "from-blue-500 to-blue-700",
      bg: "bg-blue-50",
      text: "text-blue-700",
      href: "/admin/students",
    },
    {
      label: "Cursos activos",
      value: activeCourses,
      sub: `${totalCourses} cursos en total`,
      icon: BookOpen,
      gradient: "from-violet-500 to-violet-700",
      bg: "bg-violet-50",
      text: "text-violet-700",
      href: "/admin/courses",
    },
    {
      label: "Docentes",
      value: totalTeachers,
      sub: "Registrados en el sistema",
      icon: UserCheck,
      gradient: "from-emerald-500 to-emerald-700",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      href: "/admin/teachers",
    },
    {
      label: "Pagos pendientes",
      value: pendingPayments + overduePayments,
      sub: `${overduePayments} vencidos, ${pendingPayments} a vencer`,
      icon: CreditCard,
      gradient: overduePayments > 0 ? "from-red-500 to-red-700" : "from-amber-500 to-amber-700",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.text}`} strokeWidth={2} />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{kpi.label}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick actions + trend section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Quick actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Accesos rápidos</h2>
          </div>
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

        {/* Activity / status panel */}
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
    </div>
  );
}
