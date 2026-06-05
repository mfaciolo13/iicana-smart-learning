import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getEnrollmentById } from "@/modules/enrollments/services/enrollments.service";
import { updateEnrollmentAction, deleteEnrollmentAction } from "@/modules/enrollments/actions";
import { FormButton } from "@/components/ui/FormButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EnrollmentStatusForm } from "@/modules/enrollments/components/EnrollmentStatusForm";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "warning" }> = {
  active: { label: "Activo", variant: "success" },
  completed: { label: "Completado", variant: "neutral" },
  withdrawn: { label: "Dado de baja", variant: "warning" },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const enrollment = await getEnrollmentById(id);
  if (!enrollment) notFound();

  const statusCfg = STATUS_CONFIG[enrollment.status] ?? { label: enrollment.status, variant: "neutral" as const };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/administrativo/enrollments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Inscripciones
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            {enrollment.student.fullName} — {enrollment.course.name}
          </h2>
        </div>
        <FormButton
          action={deleteEnrollmentAction}
          fields={{ id: enrollment.id }}
          variant="danger"
          confirmMessage="¿Eliminar esta inscripción? Esta acción no se puede deshacer."
        >
          Eliminar
        </FormButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Alumno">
          <dl className="space-y-3 pt-1">
            {[
              { label: "Nombre", value: enrollment.student.fullName },
              { label: "DNI", value: enrollment.student.dni },
              { label: "Email", value: enrollment.student.email },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-800">{item.value}</dd>
              </div>
            ))}
            <div className="pt-1">
              <Link href={`/administrativo/students?q=${enrollment.student.dni}`} className="text-xs text-brand-700 hover:underline inline-flex items-center gap-1">
                Ver perfil del alumno <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </dl>
        </Card>

        <Card title="Curso">
          <dl className="space-y-3 pt-1">
            {[
              { label: "Nombre", value: enrollment.course.name },
              { label: "Nivel", value: LEVEL_LABELS[enrollment.course.level] ?? enrollment.course.level },
              { label: "Horario", value: enrollment.course.schedule },
              { label: "Inscripto el", value: new Date(enrollment.enrolledAt).toLocaleDateString("es-AR") },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Estado de la inscripción</h3>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
        <EnrollmentStatusForm
          enrollmentId={enrollment.id}
          currentStatus={enrollment.status}
          action={updateEnrollmentAction}
        />
      </div>
    </div>
  );
}
