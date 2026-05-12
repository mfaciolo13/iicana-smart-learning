import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getStudentByProfileId } from "@/modules/students/services/students.service";
import { hasSurveySubmitted } from "@/modules/teacher-evaluations/services/teacher-evaluations.service";
import { submitSurveyAction } from "@/modules/teacher-evaluations/actions";
import { SurveyForm } from "@/modules/teacher-evaluations/components/SurveyForm";

export default async function AlumnoSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const { courseId } = await params;
  const { enrollment: enrollmentId } = await searchParams;

  const user = await getServerUser();
  if (!user) redirect("/login");

  const student = await getStudentByProfileId(user.id);
  if (!student) redirect("/alumno");

  if (enrollmentId && (await hasSurveySubmitted(enrollmentId))) {
    redirect("/alumno/evaluations");
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, name, teacher_id, teachers(profiles(full_name))")
    .eq("id", courseId)
    .single();

  if (!course || !course.teacher_id) notFound();

  const teacherName =
    (course.teachers as unknown as { profiles: { full_name: string } | null } | null)
      ?.profiles?.full_name ?? "";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Evaluación docente</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {course.name} · {teacherName}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
        <SurveyForm
          teacherId={course.teacher_id}
          courseId={course.id}
          enrollmentId={enrollmentId ?? ""}
          action={submitSurveyAction}
        />
      </div>
    </div>
  );
}
