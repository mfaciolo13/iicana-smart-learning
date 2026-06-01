import { createClient } from "@/lib/supabase/server";
import { createObservationAction } from "@/modules/teacher-evaluations/actions";
import { ObservationForm } from "@/modules/teacher-evaluations/components/ObservationForm";

export default async function NewObservationPage() {
  const supabase = await createClient();

  const [teachersRes, coursesRes] = await Promise.all([
    supabase.from("teachers").select("id, profiles(full_name)"),
    supabase.from("courses").select("id, name, teacher_id").eq("status", "active").order("name"),
  ]);

  const teachers = (teachersRes.data ?? []).map((t) => ({
    id: t.id,
    fullName: (t.profiles as unknown as { full_name: string } | null)?.full_name ?? "",
  }));

  const courses = (coursesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    teacherId: c.teacher_id,
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Registrar observación de clase</h2>
        <p className="text-sm text-slate-400 mt-0.5">Completá el formulario de observación</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        <ObservationForm
          teachers={teachers}
          courses={courses}
          action={createObservationAction}
        />
      </div>
    </div>
  );
}
