import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import type { EnrollmentForSurvey } from "@/modules/teacher-evaluations/types";
import { LEVEL_LABELS } from "@/lib/level-labels";

export default async function AlumnoEvaluationsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!studentRow) redirect("/alumno");

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("id, course_id, courses(id, name, level, teacher_id, teachers(profiles(full_name)))")
    .eq("student_id", studentRow.id)
    .eq("status", "active");

  const enrollmentIds = (enrollmentRows ?? []).map((e) => e.id);

  const { data: surveyRows } = enrollmentIds.length > 0
    ? await supabase
        .from("teacher_surveys")
        .select("id, enrollment_id")
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const surveyByEnrollment = new Map((surveyRows ?? []).map((s) => [s.enrollment_id, s.id]));

  type CourseRaw = {
    id: string;
    name: string;
    level: string;
    teacher_id: string | null;
    teachers: { profiles: { full_name: string } | null } | null;
  } | null;

  const enrollments: EnrollmentForSurvey[] = (enrollmentRows ?? []).map((e) => {
    const course = e.courses as unknown as CourseRaw;
    return {
      enrollmentId: e.id,
      courseId: course?.id ?? e.course_id,
      courseName: course?.name ?? "",
      courseLevel: course?.level ?? "",
      teacherId: course?.teacher_id ?? null,
      teacherName: course?.teachers?.profiles?.full_name ?? null,
      surveyId: surveyByEnrollment.get(e.id) ?? null,
    };
  });

  const withTeacher = enrollments.filter((e) => e.teacherId !== null);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Evaluar docentes</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Tus respuestas son anónimas y ayudan a mejorar la calidad educativa
        </p>
      </div>

      {withTeacher.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">No tenés cursos con docentes asignados para evaluar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withTeacher.map((e) => (
            <div
              key={e.enrollmentId}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{e.courseName}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {LEVEL_LABELS[e.courseLevel] ?? e.courseLevel} · {e.teacherName}
                </p>
              </div>

              {e.surveyId ? (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full whitespace-nowrap">
                  Evaluado
                </span>
              ) : (
                <Link
                  href={`/alumno/evaluations/${e.courseId}?enrollment=${e.enrollmentId}`}
                  className="text-sm font-medium text-brand-700 hover:underline whitespace-nowrap inline-flex items-center gap-1"
                >
                  Evaluar <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
