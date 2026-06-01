import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTeacherAction } from "@/modules/teachers/actions";
import { TeacherForm } from "@/modules/teachers/components/TeacherForm";
import type { TeacherWithProfile } from "@/modules/teachers/types";

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("teachers")
    .select("id, dni, specialization, profile_id, created_at, profiles(full_name, email, phone)")
    .eq("id", id)
    .single();

  if (!row) notFound();

  type ProfileRaw = { full_name: string; email: string; phone: string | null } | null;
  const profileRaw = row.profiles as unknown as ProfileRaw;

  const teacher: TeacherWithProfile = {
    id: row.id,
    dni: row.dni,
    specialization: row.specialization as string | null,
    profileId: row.profile_id,
    createdAt: new Date(row.created_at),
    profile: {
      fullName: profileRaw?.full_name ?? "",
      email: profileRaw?.email ?? "",
      phone: profileRaw?.phone ?? null,
    },
  };

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
