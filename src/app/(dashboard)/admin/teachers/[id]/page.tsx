import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeacherById } from "@/modules/teachers/services/teachers.service";
import { deleteTeacherAction } from "@/modules/teachers/actions";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacherById(id);

  if (!teacher) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/admin/teachers" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
            ← Docentes
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{teacher.profile.fullName}</h2>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/teachers/${teacher.id}/edit`} className={buttonVariants({ variant: "secondary" })}>
            Editar
          </Link>
          <FormButton
            action={deleteTeacherAction}
            fields={{ id: teacher.id }}
            variant="danger"
            confirmMessage="¿Estás seguro de eliminar este docente? Esta acción no se puede deshacer."
          >
            Eliminar
          </FormButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Datos personales">
          <dl className="space-y-3 pt-1">
            {[
              { label: "Email", value: teacher.profile.email },
              { label: "Teléfono", value: teacher.profile.phone ?? "—" },
              { label: "DNI", value: teacher.dni },
              { label: "Alta", value: new Date(teacher.createdAt).toLocaleDateString("es-AR") },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-800">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Datos profesionales">
          <dl className="space-y-3 pt-1">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Especialización</dt>
              <dd className="font-medium text-slate-800">
                {teacher.specialization ?? <span className="text-slate-400">Sin especificar</span>}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
