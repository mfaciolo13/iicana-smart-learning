import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProfesorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user?.id)
    .single();

  const { data: courses } = teacher
    ? await supabase
        .from("courses")
        .select("id, name, level, schedule, status")
        .eq("teacher_id", teacher.id)
        .eq("status", "active")
    : { data: [] };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Panel del Docente</h2>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Mis cursos activos</h3>
        {courses && courses.length > 0 ? (
          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{course.name}</p>
                  <p className="text-xs text-slate-400">{course.level} · {course.schedule}</p>
                </div>
                <Link href={`/profesor/courses/${course.id}`} className="text-xs text-brand-700 hover:underline">
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tenés cursos activos asignados.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/profesor/attendance" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <p className="text-sm font-semibold text-slate-800">Registrar asistencia</p>
          <p className="text-xs text-slate-400 mt-1">Marcá presente/ausente para la clase de hoy</p>
        </Link>
        <Link href="/profesor/grades" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <p className="text-sm font-semibold text-slate-800">Cargar notas</p>
          <p className="text-xs text-slate-400 mt-1">Ingresá notas de parciales o finales</p>
        </Link>
      </div>
    </div>
  );
}
