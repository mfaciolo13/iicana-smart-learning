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
import { DashboardCharts } from "./components/DashboardCharts";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Phase 1: KPI counts + base data for charts (all parallel)
  const [studentsRes, coursesRes, teachersRes, paymentsRes] = await Promise.all([
    supabase.from("students").select("id, status"),
    supabase.from("courses").select("id, name, level, status"),
    supabase.from("teachers").select("id"),
    supabase.from("payments").select("id, status, amount"),
  ]);

  const activeStudents = (studentsRes.data ?? []).filter((s) => s.status === "active").length;
  const totalStudents = studentsRes.data?.length ?? 0;
  const activeCourses = (coursesRes.data ?? []).filter((c) => c.status === "active").length;
  const totalCourses = coursesRes.data?.length ?? 0;
  const totalTeachers = teachersRes.data?.length ?? 0;
  const pendingPayments = (paymentsRes.data ?? []).filter((p) => p.status === "pending").length;
  const overduePayments = (paymentsRes.data ?? []).filter((p) => p.status === "overdue").length;

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

  // Phase 2: Enrollments for active courses (needed to fetch attendance/grades by enrollment IDs)
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

      <DashboardCharts
        attendanceData={attendanceData}
        gradesData={gradesData}
        levelData={levelData}
        paymentCounts={paymentCounts}
      />

    </div>
  );
}
