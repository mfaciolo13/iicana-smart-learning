import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentById } from "@/modules/students/services/students.service";
import { getEnrollmentsByStudent } from "@/modules/enrollments/services/enrollments.service";
import { getPaymentsByStudent } from "@/modules/payments/services/payments.service";
import { deleteStudentAction } from "@/modules/students/actions";
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
          <Link
            href="/admin/students"
            className="text-sm text-slate-400 hover:text-slate-600 mb-1 block"
          >
            ← Alumnos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            {student.profile.fullName}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/students/${student.id}/edit`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Editar
          </Link>
          <form action={deleteStudentAction as never}>
            <input type="hidden" name="id" value={student.id} />
            <button
              type="submit"
              className={buttonVariants({ variant: "danger" })}
              onClick={(e) => {
                if (!confirm("¿Estás seguro de eliminar este alumno? Esta acción no se puede deshacer.")) {
                  e.preventDefault();
                }
              }}
            >
              Eliminar
            </button>
          </form>
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
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Alta</dt>
              <dd className="font-medium text-slate-800">
                {new Date(student.createdAt).toLocaleDateString("es-AR")}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Enrollments */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Inscripciones</h3>
          <Link
            href={`/admin/enrollments/new?studentId=${student.id}`}
            className="text-xs text-brand-700 hover:underline font-medium"
          >
            + Inscribir en curso
          </Link>
        </div>
        <EnrollmentList enrollments={studentEnrollments} />
      </div>

      {/* Payments */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">Pagos</h3>
          <Link
            href={`/admin/payments/new?studentId=${student.id}`}
            className="text-xs text-brand-700 hover:underline font-medium"
          >
            + Registrar pago
          </Link>
        </div>
        <PaymentList payments={studentPayments} />
      </div>
    </div>
  );
}
