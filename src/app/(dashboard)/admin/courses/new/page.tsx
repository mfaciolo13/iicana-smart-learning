import { createClient } from "@/lib/supabase/server";
import { createCourseAction } from "@/modules/courses/actions";
import { CourseForm } from "@/modules/courses/components/CourseForm";
import type { TeacherListItem } from "@/modules/teachers/types";

export default async function NewCoursePage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("teachers")
    .select("id, dni, specialization, profiles(full_name, email)")
    .order("profiles(full_name)");

  type ProfileRaw = { full_name: string; email: string } | null;
  const teachers: TeacherListItem[] = (rows ?? []).map((t) => {
    const profile = t.profiles as unknown as ProfileRaw;
    return {
      id: t.id,
      fullName: profile?.full_name ?? "",
      email: profile?.email ?? "",
      dni: t.dni,
      specialization: t.specialization,
    };
  });

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
