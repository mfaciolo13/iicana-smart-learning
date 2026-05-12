import { createClient } from "@/lib/supabase/server";
import { createGradeAction } from "@/modules/grades/actions";
import { GradeForm } from "@/modules/grades/components/GradeForm";
import type { EnrollmentListItem } from "@/modules/enrollments/types";

export default async function NewGradePage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("enrollments")
    .select("id, enrolled_at, status, students(profiles(full_name), dni), courses(name, level)")
    .eq("status", "active")
    .order("enrolled_at", { ascending: true });

  const activeEnrollments: EnrollmentListItem[] = (rows ?? []).map((e) => {
    const student = e.students as unknown as { profiles: { full_name: string } | null; dni: string } | null;
    const course = e.courses as unknown as { name: string; level: string } | null;
    return {
      id: e.id,
      enrolledAt: new Date(e.enrolled_at),
      status: e.status as EnrollmentListItem["status"],
      studentName: student?.profiles?.full_name ?? "",
      studentDni: student?.dni ?? "",
      courseName: course?.name ?? "",
      courseLevel: course?.level ?? "",
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Cargar nota</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Registrá el resultado de una evaluación para un alumno inscripto
        </p>
      </div>
      <GradeForm enrollments={activeEnrollments} action={createGradeAction} submitLabel="Cargar nota" />
    </div>
  );
}
