import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteTeacherAction } from "@/modules/teachers/actions";
import { resendInvitationAction } from "@/modules/users/actions";
import { FormButton } from "@/components/ui/FormButton";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("teachers")
    .select("id, dni, specialization, profile_id, created_at")
    .eq("id", id)
    .single();

  // SCRUM-234: tras eliminar desde el detalle, volver al listado en lugar de mostrar un 404.
  if (!row) redirect("/director/teachers");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", row.profile_id)
    .single();

  const teacher = {
    id: row.id,
    dni: row.dni,
    specialization: row.specialization as string | null,
    createdAt: row.created_at,
    profile: {
      fullName: profileRow?.full_name ?? "",
      email: profileRow?.email ?? "",
      phone: profileRow?.phone ?? null,
    },
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/director/teachers" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Docentes
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{teacher.profile.fullName}</h2>
        </div>
        <div className="flex gap-2">
          <Link href={`/director/teachers/${teacher.id}/edit`} className={buttonVariants({ variant: "secondary" })}>
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
          <div className="mt-4 pt-4 border-t border-slate-100">
            <FormButton
              action={resendInvitationAction}
              fields={{ email: teacher.profile.email, fullName: teacher.profile.fullName, role: "profesor" }}
              variant="ghost"
              size="sm"
              className="w-full justify-center text-slate-600"
              confirmMessage={`¿Reenviar invitación a ${teacher.profile.email}?`}
            >
              Reenviar invitación por email
            </FormButton>
          </div>
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
