import { createClient } from "@/lib/supabase/server";
import { AssessmentsListPage } from "@/modules/assessments/components/AssessmentsListPage";
import type { AssessmentListItem, QuizQuestion } from "@/modules/assessments/types";

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
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

  return (
    <AssessmentsListPage
      sp={sp}
      basePath="/director/assessments"
      items={items}
      subtitle="Quizzes semanales generados con inteligencia artificial"
    />
  );
}
