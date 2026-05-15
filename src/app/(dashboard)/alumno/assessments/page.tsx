import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import type { StudentAssessmentItem } from "@/modules/assessments/types";
import type { QuizQuestion } from "@/modules/assessments/types";
import { redirect } from "next/navigation";

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500";
  return (
    <span className={`text-lg font-bold ${color}`}>{score}%</span>
  );
}

export default async function AlumnoAssessmentsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  let items: StudentAssessmentItem[] = [];

  if (studentRow) {
    const { data: enrollmentRows } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", studentRow.id)
      .eq("status", "active");

    const courseIds = (enrollmentRows ?? []).map((e) => e.course_id);

    if (courseIds.length > 0) {
      const { data: assessmentRows } = await supabase
        .from("assessments")
        .select("id, course_id, week_label, topic, questions, courses(name)")
        .eq("status", "published")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });

      const assessmentIds = (assessmentRows ?? []).map((a) => a.id);

      const { data: attemptRows } = assessmentIds.length > 0
        ? await supabase
            .from("assessment_attempts")
            .select("id, assessment_id, score, completed_at")
            .eq("student_id", user.id)
            .in("assessment_id", assessmentIds)
        : { data: [] };

      const attemptByAssessment = new Map(
        (attemptRows ?? []).map((a) => [a.assessment_id, a])
      );

      type CourseRaw = { name: string } | null;

      items = (assessmentRows ?? []).map((a) => {
        const course = a.courses as unknown as CourseRaw;
        const attempt = attemptByAssessment.get(a.id);
        const questions = a.questions as unknown as QuizQuestion[];
        return {
          id: a.id,
          courseId: a.course_id,
          courseName: course?.name ?? "",
          weekLabel: a.week_label,
          topic: a.topic,
          questionCount: Array.isArray(questions) ? questions.length : 0,
          attempt: attempt
            ? { id: attempt.id, score: attempt.score, completedAt: new Date(attempt.completed_at) }
            : null,
        };
      });
    }
  }

  const pending = items.filter((a) => !a.attempt).length;
  const completed = items.filter((a) => a.attempt !== null).length;
  const avgScore =
    completed > 0
      ? Math.round(
          items
            .filter((a) => a.attempt)
            .reduce((s, a) => s + a.attempt!.score, 0) / completed
        )
      : null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Mis Autoevaluaciones</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Quizzes semanales para practicar y reforzar lo aprendido
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Pendientes", value: pending, color: "text-amber-600" },
          { label: "Completadas", value: completed, color: "text-emerald-600" },
          { label: "Promedio", value: avgScore !== null ? `${avgScore}%` : "—", color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎓</span>
          </div>
          <p className="text-base font-semibold text-slate-700">Sin evaluaciones disponibles</p>
          <p className="text-sm text-slate-400 mt-1">
            Tu docente aún no publicó evaluaciones para tus cursos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-slate-400">{item.courseName}</p>
                  <span className="text-slate-200">·</span>
                  <p className="text-xs text-slate-400">{item.weekLabel}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{item.topic}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.questionCount} preguntas</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {item.attempt ? (
                  <>
                    <ScoreRing score={item.attempt.score} />
                    <Link
                      href={`/alumno/assessments/${item.id}/resultado`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Ver resultado
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/alumno/assessments/${item.id}`}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 inline-flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
                  >
                    Comenzar <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
