import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStudentById } from "@/modules/students/services/students.service";
import { getEnrollmentsByStudent } from "@/modules/enrollments/services/enrollments.service";
import { getPaymentsByStudent } from "@/modules/payments/services/payments.service";
import { deleteStudentAction, toggleAccessRestrictedAction } from "@/modules/students/actions";
import { resendInvitationAction } from "@/modules/users/actions";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EnrollmentList } from "@/modules/enrollments/components/EnrollmentList";
import { PaymentList } from "@/modules/payments/components/PaymentList";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" | "info" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  suspended: { label: "Suspendido", variant: "danger" },
  graduated: { label: "Egresado", variant: "info" },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [student, studentEnrollments, studentPayments] = await Promise.all([
    getStudentById(id),
    getEnrollmentsByStudent(id),
    getPaymentsByStudent(id),
  ]);

  if (!student) notFound();

  const status = STATUS_CONFIG[student.status] ?? { label: student.status, variant: "neutral" as const };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/director/students" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Alumnos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{student.profile.fullName}</h2>
        </div>
        <div className="flex gap-2">
          <Link href={`/director/students/${student.id}/edit`} className={buttonVariants({ variant: "secondary" })}>
            Editar
          </Link>
          <FormButton
            action={deleteStudentAction}
            fields={{ id: student.id }}
            variant="danger"
            confirmMessage="¿Estás seguro de eliminar este alumno? Esta acción no se puede deshacer."
          >
            Eliminar
          </FormButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Datos personales">
          <dl className="space-y-3 pt-1">
            {[
              { label: "Email", value: student.profile.email },
              { label: "Teléfono", value: student.profile.phone ?? "—" },
              { label: "DNI", value: student.dni },
              { label: "Fecha de nacimiento", value: student.birthDate },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-800">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <FormButton
              action={resendInvitationAction}
              fields={{ email: student.profile.email, fullName: student.profile.fullName, role: "alumno" }}
              variant="ghost"
              size="sm"
              className="w-full justify-center text-slate-600"
              confirmMessage={`¿Reenviar invitación a ${student.profile.email}?`}
            >
              Reenviar invitación por email
            </FormButton>
          </div>
        </Card>

        <Card title="Datos académicos">
          <dl className="space-y-3 pt-1">
            <div className="flex justify-between text-sm items-center">
              <dt className="text-slate-500">Nivel</dt>
              <dd>
                {student.level ? (
                  <Badge variant="info" dot={false}>{LEVEL_LABELS[student.level] ?? student.level}</Badge>
                ) : (
                  <span className="font-medium text-slate-400">Sin asignar</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between text-sm items-center">
              <dt className="text-slate-500">Estado</dt>
              <dd><Badge variant={status.variant}>{status.label}</Badge></dd>
            </div>
            <div className="flex justify-between text-sm items-center">
              <dt className="text-slate-500">Acceso</dt>
              <dd>
                <Badge variant={student.accessRestricted ? "danger" : "success"} dot={false}>
                  {student.accessRestricted ? "Restringido" : "Habilitado"}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Alta</dt>
              <dd className="font-medium text-slate-800">
                {new Date(student.createdAt).toLocaleDateString("es-AR")}
              </dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <FormButton
              action={toggleAccessRestrictedAction}
              fields={{ id: student.id, restrict: student.accessRestricted ? "false" : "true" }}
              variant={student.accessRestricted ? "secondary" : "danger"}
              size="sm"
              className="w-full justify-center"
              confirmMessage={student.accessRestricted ? "¿Levantar la restricción de acceso?" : "¿Restringir el acceso a este alumno?"}
            >
              {student.accessRestricted ? "Levantar restricción" : "Restringir acceso"}
            </FormButton>
          </div>
        </Card>
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Inscripciones</h3>
          <Link href={`/director/enrollments/new?studentId=${student.id}`} className="text-xs text-brand-700 hover:underline font-medium">
            + Inscribir en curso
          </Link>
        </div>
        <EnrollmentList enrollments={studentEnrollments} />
      </div>

      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Pagos</h3>
          <Link href={`/director/payments/new?studentId=${student.id}`} className="text-xs text-brand-700 hover:underline font-medium">
            + Registrar pago
          </Link>
        </div>
        <PaymentList payments={studentPayments} />
      </div>
    </div>
  );
}
