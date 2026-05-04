import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerUser } from "@/lib/auth/helpers";
import { getCourseById } from "@/modules/courses/services/courses.service";
import { getEnrollmentsByCourse } from "@/modules/enrollments/services/enrollments.service";
import { db } from "@/lib/drizzle";
import { teachers } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LEVEL_LABELS } from "@/lib/level-labels";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "info" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  completed: { label: "Finalizado", variant: "info" },
};

export default async function ProfesorCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [teacher] = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.profileId, user.id))
    .limit(1);

  if (!teacher) notFound();

  const [course, courseEnrollments] = await Promise.all([
    getCourseById(id),
    getEnrollmentsByCourse(id),
  ]);

  if (!course) notFound();

  // Only allow the assigned teacher to view this course
  if (course.teacherId !== teacher.id) notFound();

  const status = STATUS_CONFIG[course.status] ?? { label: course.status, variant: "neutral" as const };
  const activeEnrollments = courseEnrollments.filter((e) => e.status === "active");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/profesor" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Mis cursos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{course.name}</h2>
        </div>
        <Link
          href={`/profesor/attendance/new?courseId=${course.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          + Tomar asistencia
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Cupo">
          <div className="pt-1">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-500">Inscriptos activos</span>
              <span className="font-medium text-slate-800">{activeEnrollments.length} / {course.maxCapacity}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  activeEnrollments.length >= course.maxCapacity ? "bg-red-500"
                  : activeEnrollments.length / course.maxCapacity >= 0.8 ? "bg-amber-400"
                  : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min((activeEnrollments.length / course.maxCapacity) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{Math.round((activeEnrollments.length / course.maxCapacity) * 100)}% de ocupación</p>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Alumnos inscriptos ({activeEnrollments.length})
          </h3>
          <Link
            href={`/profesor/grades/new?courseId=${course.id}`}
            className="text-xs text-blue-700 hover:underline font-medium"
          >
            + Cargar nota
          </Link>
        </div>
        {activeEnrollments.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No hay alumnos activos inscriptos en este curso.</p>
        ) : (
          <div className="space-y-1">
            {activeEnrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-900">{e.studentName}</p>
                  <p className="text-xs text-slate-400 font-mono">{e.studentDni}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
