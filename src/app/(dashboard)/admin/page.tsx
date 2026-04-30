import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch key stats in parallel
  const [studentsRes, coursesRes, teachersRes, paymentsRes] = await Promise.all(
    [
      supabase
        .from("students")
        .select("id, status", { count: "exact", head: false }),
      supabase
        .from("courses")
        .select("id, status", { count: "exact", head: false }),
      supabase
        .from("teachers")
        .select("id", { count: "exact", head: false }),
      supabase
        .from("payments")
        .select("id, status", { count: "exact", head: false }),
    ]
  );

  const totalStudents = studentsRes.count ?? 0;
  const activeStudents =
    studentsRes.data?.filter((s) => s.status === "active").length ?? 0;
  const totalCourses = coursesRes.count ?? 0;
  const activeCourses =
    coursesRes.data?.filter((c) => c.status === "active").length ?? 0;
  const totalTeachers = teachersRes.count ?? 0;
  const overduePayments =
    paymentsRes.data?.filter((p) => p.status === "overdue").length ?? 0;

  const stats = [
    {
      label: "Alumnos activos",
      value: activeStudents,
      sub: `${totalStudents} total`,
      color: "bg-blue-500",
    },
    {
      label: "Cursos activos",
      value: activeCourses,
      sub: `${totalCourses} total`,
      color: "bg-green-500",
    },
    {
      label: "Docentes",
      value: totalTeachers,
      sub: "registrados",
      color: "bg-purple-500",
    },
    {
      label: "Pagos vencidos",
      value: overduePayments,
      sub: "requieren atención",
      color: overduePayments > 0 ? "bg-red-500" : "bg-gray-400",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Panel de Administración
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${stat.color} text-white text-lg font-bold mb-3`}
            >
              {stat.value}
            </div>
            <p className="text-sm font-medium text-gray-800">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Accesos rápidos
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Nuevo alumno", href: "/admin/students/new" },
            { label: "Nuevo curso", href: "/admin/courses/new" },
            { label: "Registrar pago", href: "/admin/payments/new" },
            { label: "Tomar asistencia", href: "/admin/attendance" },
            { label: "Cargar notas", href: "/admin/grades" },
            { label: "Ver reportes", href: "/admin/reports" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center justify-center px-4 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
