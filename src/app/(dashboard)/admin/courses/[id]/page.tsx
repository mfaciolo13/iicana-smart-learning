import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseById } from "@/modules/courses/services/courses.service";
import { getEnrollmentsByCourse } from "@/modules/enrollments/services/enrollments.service";
import { deleteCourseAction } from "@/modules/courses/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EnrollmentList } from "@/modules/enrollments/components/EnrollmentList";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "info" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  completed: { label: "Finalizado", variant: "info" },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [course, courseEnrollments] = await Promise.all([
    getCourseById(id),
    getEnrollmentsByCourse(id),
  ]);

  if (!course) notFound();

  const status = STATUS_CONFIG[course.status] ?? { label: course.status, variant: "neutral" as const };
  const occupancy = Math.round((course.enrollmentCount / course.maxCapacity) * 100);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/courses" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
            ← Cursos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{course.name}</h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/courses/${course.id}/edit`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Editar
          </Link>
          <form action={deleteCourseAction as never}>
            <input type="hidden" name="id" value={course.id} />
            <button
              type="submit"
              className={buttonVariants({ variant: "danger" })}
              onClick={(e) => {
                if (!confirm("¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.")) {
                  e.preventDefault();
                }
              }}
            >
              Eliminar
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Datos del curso">
          <dl className="space-y-3 pt-1">
            <div className="flex justify-between text-sm items-center">
              <dt className="text-slate-500">Nivel</dt>
              <dd>
                <Badge variant="info" dot={false}>{LEVEL_LABELS[course.level] ?? course.level}</Badge>
              </dd>
            </div>
            <div className="flex justify-between text-sm items-center">
              <dt className="text-slate-500">Estado</dt>
              <dd><Badge variant={status.variant}>{status.label}</Badge></dd>
            </div>
            {[
              { label: "Horario", value: course.schedule },
              { label: "Aula", value: course.classroom ?? "—" },
              { label: "Alta", value: new Date(course.createdAt).toLocaleDateString("es-AR") },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Cupo y docente">
          <dl className="space-y-4 pt-1">
            {/* Occupancy bar */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <dt className="text-slate-500">Inscriptos</dt>
                <dd className="font-medium text-slate-800">
                  {course.enrollmentCount} / {course.maxCapacity}
                </dd>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    occupancy >= 100 ? "bg-red-500" : occupancy >= 80 ? "bg-amber-400" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(occupancy, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{occupancy}% de ocupación</p>
            </div>

            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Docente</dt>
              <dd className="font-medium text-slate-800">
                {course.teacher?.fullName ?? <span className="text-slate-400">Sin asignar</span>}
              </dd>
            </div>
            {course.teacher && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Email docente</dt>
                <dd className="text-slate-600">{course.teacher.email}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Enrolled students */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Alumnos inscriptos</h3>
          <Link
            href={`/admin/enrollments/new?courseId=${course.id}`}
            className="text-xs text-brand-700 hover:underline font-medium"
          >
            + Inscribir alumno
          </Link>
        </div>
        <EnrollmentList enrollments={courseEnrollments} />
      </div>
    </div>
  );
}
