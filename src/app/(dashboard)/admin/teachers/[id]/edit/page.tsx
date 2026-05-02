import { notFound } from "next/navigation";
import { getTeacherById } from "@/modules/teachers/services/teachers.service";
import { updateTeacherAction } from "@/modules/teachers/actions";
import { TeacherForm } from "@/modules/teachers/components/TeacherForm";

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacherById(id);

  if (!teacher) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Editar docente</h2>
        <p className="text-sm text-slate-400 mt-0.5">{teacher.profile.fullName}</p>
      </div>
      <TeacherForm teacher={teacher} action={updateTeacherAction} submitLabel="Guardar cambios" />
    </div>
  );
}
