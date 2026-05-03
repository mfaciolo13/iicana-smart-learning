import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentByProfileId } from "@/modules/students/services/students.service";
import { getEnrollmentsForSurvey } from "@/modules/teacher-evaluations/services/teacher-evaluations.service";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  elementary: "Elementary",
  pre_intermediate: "Pre-Intermediate",
  intermediate: "Intermediate",
  upper_intermediate: "Upper-Intermediate",
  advanced: "Advanced",
};

export default async function AlumnoEvaluationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const student = await getStudentByProfileId(user.id);
  if (!student) redirect("/alumno");

  const enrollments = await getEnrollmentsForSurvey(student.id);
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
                  className="text-sm font-medium text-brand-700 hover:underline whitespace-nowrap"
                >
                  Evaluar →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
