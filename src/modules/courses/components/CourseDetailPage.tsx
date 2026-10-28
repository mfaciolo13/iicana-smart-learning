import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCourseById } from "../services/courses.service";
import { deleteCourseAction } from "../actions";
import { getEnrollmentsByCourse } from "@/modules/enrollments/services/enrollments.service";
import { EnrollmentList } from "@/modules/enrollments/components/EnrollmentList";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LEVEL_LABELS } from "@/lib/level-labels";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "info" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  completed: { label: "Finalizado", variant: "info" },
};

interface CourseDetailPageProps {
  id: string;
  /** Listado de cursos del portal (back link y edición). */
  basePath: string;
  /** Inscripciones del portal (detalle y "+ Inscribir alumno"). */
  enrollmentsBasePath: string;
  /** Sólo el director edita y elimina cursos. */
  canManage: boolean;
}

/** Detalle de un curso. Lo usan director y administrativo. */
export async function CourseDetailPage({ id, basePath, enrollmentsBasePath, canManage }: CourseDetailPageProps) {
  const [course, courseEnrollments] = await Promise.all([getCourseById(id), getEnrollmentsByCourse(id)]);

  // SCRUM-357: tras eliminar desde este detalle, la revalidación ya no encuentra el curso;
  // se vuelve al listado en lugar de mostrar un 404 antes de que navegue el cliente
  // (mismo criterio que alumnos, docentes, inscripciones y notas — SCRUM-234).
  if (!course) redirect(basePath);

  const enrollmentCount = courseEnrollments.filter((e) => e.status === "active").length;
  const occupancy = Math.round((enrollmentCount / course.maxCapacity) * 100);
  const status = STATUS_CONFIG[course.status] ?? { label: course.status, variant: "neutral" as const };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href={basePath} className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Cursos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{course.name}</h2>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`${basePath}/${course.id}/edit`} className={buttonVariants({ variant: "secondary" })}>
              Editar
            </Link>
            <FormButton
              action={deleteCourseAction}
              fields={{ id: course.id }}
              variant="danger"
              confirmMessage="¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer."
            >
              Eliminar
            </FormButton>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Datos del curso">
          <dl className="space-y-3 pt-1">
            <div className="flex justify-between text-sm items-center">
              <dt className="text-slate-500">Nivel</dt>
              <dd><Badge variant="info" dot={false}>{LEVEL_LABELS[course.level] ?? course.level}</Badge></dd>
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
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <dt className="text-slate-500">Inscriptos</dt>
                <dd className="font-medium text-slate-800">{enrollmentCount} / {course.maxCapacity}</dd>
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

      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Alumnos inscriptos</h3>
          <Link href={`${enrollmentsBasePath}/new?courseId=${course.id}`} className="text-xs text-brand-700 hover:underline font-medium">
            + Inscribir alumno
          </Link>
        </div>
        <EnrollmentList enrollments={courseEnrollments} basePath={enrollmentsBasePath} />
      </div>
    </div>
  );
}
