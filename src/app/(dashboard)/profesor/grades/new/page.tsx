import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { createGradeAction } from "@/modules/grades/actions";
import { GradeForm } from "@/modules/grades/components/GradeForm";
import type { EnrollmentListItem } from "@/modules/enrollments/types";

export default async function ProfesorNewGradePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { courseId } = await searchParams;
  const supabase = await createClient();

  const { data: teacherRow } = await supabase
    .from("teachers")
    .select("id, courses(id)")
    .eq("profile_id", user.id)
    .single();

  if (!teacherRow) redirect("/login");

  const courseIds = (teacherRow.courses as unknown as { id: string }[] | null ?? []).map((c) => c.id);

  const { data: enrollmentRows } = courseIds.length > 0
    ? await supabase
        .from("enrollments")
        .select("id, enrolled_at, status, students(profiles(full_name), dni), courses(name, level)")
        .in("course_id", courseIds)
        .eq("status", "active")
        .order("enrolled_at", { ascending: true })
    : { data: [] };

  type StudentRaw = { profiles: { full_name: string } | null; dni: string } | null;
  type CourseRaw = { name: string; level: string } | null;

  const enrollments: EnrollmentListItem[] = (enrollmentRows ?? []).map((e) => {
    const student = e.students as unknown as StudentRaw;
    const course = e.courses as unknown as CourseRaw;
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
          Registrá el resultado de una evaluación para un alumno inscripto en tus cursos
        </p>
      </div>
      <GradeForm
        enrollments={enrollments}
        action={createGradeAction}
        submitLabel="Cargar nota"
        cancelHref="/profesor/grades"
        redirectTo="/profesor/grades"
      />
    </div>
  );
}
