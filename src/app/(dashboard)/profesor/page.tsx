import { createClient } from "@/lib/supabase/server";

export default async function ProfesorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Panel del Docente
      </h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Mis cursos activos
        </h3>
        {courses && courses.length > 0 ? (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {course.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {course.level} · {course.schedule}
                  </p>
                </div>
                <a
                  href={`/profesor/courses/${course.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver →
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No tenés cursos activos asignados.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/profesor/attendance"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-sm font-semibold text-gray-800">
            Registrar asistencia
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Marcá presente/ausente para la clase de hoy
          </p>
        </a>
        <a
          href="/profesor/grades"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors"
        >
          <p className="text-sm font-semibold text-gray-800">Cargar notas</p>
          <p className="text-xs text-gray-400 mt-1">
            Ingresá notas de parciales o finales
          </p>
        </a>
      </div>
    </div>
  );
}
