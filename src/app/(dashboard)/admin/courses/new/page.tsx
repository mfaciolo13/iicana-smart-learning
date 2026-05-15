import { createClient } from "@/lib/supabase/server";
import { createCourseAction } from "@/modules/courses/actions";
import { CourseForm } from "@/modules/courses/components/CourseForm";
import type { TeacherListItem } from "@/modules/teachers/types";

export default async function NewCoursePage() {
  const supabase = await createClient();

  const { data: teacherRows } = await supabase
    .from("teachers")
    .select("id, dni, specialization, profile_id");

  const profileIds = (teacherRows ?? []).map((t) => t.profile_id);
  const { data: profileRows } = profileIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
    : { data: [] as { id: string; full_name: string; email: string }[] };

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

  const teachers: TeacherListItem[] = (teacherRows ?? [])
    .map((t) => {
      const profile = profileMap.get(t.profile_id);
      return {
        id: t.id,
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? "",
        dni: t.dni,
        specialization: t.specialization,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Nuevo curso</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Completá los datos para crear un nuevo curso
        </p>
      </div>
      <CourseForm teachers={teachers} action={createCourseAction} submitLabel="Crear curso" />
    </div>
  );
}
