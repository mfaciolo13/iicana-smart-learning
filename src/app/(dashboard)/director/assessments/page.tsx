import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AssessmentList } from "@/modules/assessments/components/AssessmentList";
import { buttonVariants } from "@/components/ui/Button";
import type { AssessmentListItem } from "@/modules/assessments/types";
import type { QuizQuestion } from "@/modules/assessments/types";

export default async function AdminAssessmentsPage() {
  const supabase = await createClient();

  const [{ data: assessmentRows }, { data: attemptRows }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, course_id, week_label, topic, status, questions, created_at, courses(name)")
      .order("created_at", { ascending: false }),
    supabase.from("assessment_attempts").select("assessment_id"),
  ]);

  const attemptCountByAssessment = new Map<string, number>();
  for (const a of attemptRows ?? []) {
    attemptCountByAssessment.set(a.assessment_id, (attemptCountByAssessment.get(a.assessment_id) ?? 0) + 1);
  }

  type CourseRaw = { name: string } | null;

  const items: AssessmentListItem[] = (assessmentRows ?? []).map((a) => {
    const course = a.courses as unknown as CourseRaw;
    const questions = a.questions as unknown as QuizQuestion[];
    return {
      id: a.id,
      courseId: a.course_id,
      courseName: course?.name ?? "",
      weekLabel: a.week_label,
      topic: a.topic,
      status: a.status as AssessmentListItem["status"],
      questionCount: Array.isArray(questions) ? questions.length : 0,
      attemptCount: attemptCountByAssessment.get(a.id) ?? 0,
      createdAt: new Date(a.created_at),
    };
  });

  const total = items.length;
  const published = items.filter((a) => a.status === "published").length;
  const drafts = items.filter((a) => a.status === "draft").length;
  const totalAttempts = items.reduce((sum, a) => sum + a.attemptCount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Autoevaluaciones IA</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Quizzes semanales generados con inteligencia artificial
          </p>
        </div>
        <Link
          href="/director/assessments/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          + Nueva evaluación
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: total, color: "text-slate-700" },
          { label: "Publicadas", value: published, color: "text-emerald-600" },
          { label: "Borradores", value: drafts, color: "text-amber-600" },
          { label: "Intentos", value: totalAttempts, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <AssessmentList assessments={items} />
      </div>
    </div>
  );
}
