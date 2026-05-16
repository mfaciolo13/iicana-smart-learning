import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateStudentAction } from "@/modules/students/actions";
import { StudentForm } from "@/modules/students/components/StudentForm";
import type { StudentWithProfile } from "@/modules/students/types";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("students")
    .select("id, dni, birth_date, level, placement_test_score, status, profile_id, created_at, updated_at, profiles(full_name, email, phone)")
    .eq("id", id)
    .single();

  if (!row) notFound();

  type ProfileRaw = { full_name: string; email: string; phone: string | null } | null;
  const profileRaw = row.profiles as unknown as ProfileRaw;

  const student: StudentWithProfile = {
    id: row.id,
    dni: row.dni,
    birthDate: row.birth_date,
    level: row.level as StudentWithProfile["level"],
    placementTestScore: row.placement_test_score as number | null,
    status: row.status as StudentWithProfile["status"],
    profileId: row.profile_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    profile: {
      fullName: profileRaw?.full_name ?? "",
      email: profileRaw?.email ?? "",
      phone: profileRaw?.phone ?? null,
    },
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Editar alumno</h2>
        <p className="text-sm text-slate-400 mt-0.5">{student.profile.fullName}</p>
      </div>
      <StudentForm student={student} action={updateStudentAction} submitLabel="Guardar cambios" />
    </div>
  );
}
