import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, PenLine } from "lucide-react";
import { getServerUser } from "@/lib/auth/helpers";
import { LEVEL_LABELS } from "@/lib/level-labels";
import { cn } from "@/lib/cn";
import { ChartSkeleton } from "@/components/charts/ChartCard";
import { getTeacherCourses } from "@/modules/analytics/services/teacher-analytics.service";
import { TeacherCourseCharts, TeacherOverviewCharts } from "./components/TeacherCharts";

const WEEKDAYS_ES: Record<string, string> = {
  monday: "lunes",
  tuesday: "martes",
  wednesday: "miércoles",
  thursday: "jueves",
  friday: "viernes",
  saturday: "sábado",
  sunday: "domingo",
};

/** Día de la semana de hoy en hora del instituto, con los mismos nombres que el enum de la base. */
function todayWeekday(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Argentina/Cordoba" }).toLowerCase();
}

export default async function ProfesorDashboardPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const user = await getServerUser();
  const { course: courseParam } = await searchParams;

  const myCourses = user ? await getTeacherCourses(user.id) : [];
  // Sólo se grafican cursos propios: un id ajeno en la URL cae al primero.
  const selected = myCourses.find((c) => c.id === courseParam) ?? myCourses[0] ?? null;
  const today = todayWeekday();
  const classesToday = myCourses.filter((c) => c.classDays.includes(today));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Panel del Docente</h2>
        <p className="text-sm text-slate-400 mt-0.5">Cómo van tus cursos, de un vistazo</p>
      </div>

      {classesToday.length > 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
          <CalendarCheck className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="text-sm font-medium text-brand-800">Hoy ({WEEKDAYS_ES[today]}) tenés clase:</span>
          {classesToday.map((c) => (
            <Link
              key={c.id}
              href={`/profesor/attendance/new?courseId=${c.id}`}
              className="text-xs font-semibold bg-white text-brand-700 px-2.5 py-1 rounded-full border border-brand-200 hover:bg-brand-100 transition-colors"
            >
              {c.name} · {c.classTime.slice(0, 5)} · Tomar asistencia
            </Link>
          ))}
        </div>
      )}

      {myCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-400">No tenés cursos activos asignados.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Mis cursos activos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myCourses.map((course) => {
                const active = selected?.id === course.id;
                return (
                  <div
                    key={course.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-colors",
                      active ? "border-brand-300 bg-brand-50/50" : "border-slate-100"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{course.name}</p>
                      <p className="text-xs text-slate-400">
                        {LEVEL_LABELS[course.level] ?? course.level} · {course.enrolled}/{course.capacity} alumnos
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!active && (
                        <Link href={`/profesor?course=${course.id}`} className="text-xs text-slate-500 hover:text-brand-700 hover:underline">
                          Ver gráficos
                        </Link>
                      )}
                      <Link href={`/profesor/courses/${course.id}`} className="text-xs text-brand-700 hover:underline inline-flex items-center gap-1">
                        Detalle <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {user && (
            <Suspense fallback={<ChartSkeleton />}>
              <TeacherOverviewCharts profileId={user.id} />
            </Suspense>
          )}

          {selected && (
            <>
              <div className="pt-2">
                <h3 className="text-base font-semibold text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-400">Asistencia, notas y autoevaluaciones de este curso</p>
              </div>
              <Suspense
                key={selected.id}
                fallback={
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartSkeleton />
                    <ChartSkeleton />
                  </div>
                }
              >
                <TeacherCourseCharts courseId={selected.id} />
              </Suspense>
            </>
          )}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/profesor/attendance" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors flex items-start gap-3">
          <CalendarCheck className="w-5 h-5 text-slate-400 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-slate-800">Registrar asistencia</p>
            <p className="text-xs text-slate-400 mt-1">Marcá presente/ausente para la clase de hoy</p>
          </div>
        </Link>
        <Link href="/profesor/grades" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors flex items-start gap-3">
          <PenLine className="w-5 h-5 text-slate-400 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-slate-800">Cargar notas</p>
            <p className="text-xs text-slate-400 mt-1">Ingresá notas de parciales o finales</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
