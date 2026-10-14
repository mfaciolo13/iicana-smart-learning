import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { submitSurveyAction } from "@/modules/teacher-evaluations/actions";
import { SurveyForm } from "@/modules/teacher-evaluations/components/SurveyForm";
import { getActiveEnrollmentForSurvey, hasSurveySubmitted } from "@/modules/teacher-evaluations/services/teacher-evaluations.service";

export default async function AlumnoSurveyPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!studentRow) redirect("/alumno");

  // La inscripción sale del servidor (SCRUM-280): sin inscripción activa en el curso no hay
  // formulario, y una encuesta ya respondida no se vuelve a abrir.
  const active = await getActiveEnrollmentForSurvey(user.id, courseId);
  if (!active) notFound();
  if (await hasSurveySubmitted(active.enrollmentId)) redirect("/alumno/evaluations");

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
          enrollmentId={active.enrollmentId}
          action={submitSurveyAction}
        />
      </div>
    </div>
  );
}
