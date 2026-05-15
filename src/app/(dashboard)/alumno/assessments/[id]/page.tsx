import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { QuizPlayer } from "@/modules/assessments/components/QuizPlayer";
import type { QuizQuestion } from "@/modules/assessments/types";

export default async function AlumnoAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: assessmentRow }, { data: existingRows }] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, week_label, topic, status, questions, courses(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("assessment_attempts")
      .select("id")
      .eq("assessment_id", id)
      .eq("student_id", user.id)
      .limit(1),
  ]);

  if (!assessmentRow || assessmentRow.status !== "published") notFound();

  if ((existingRows ?? []).length > 0) redirect(`/alumno/assessments/${id}/resultado`);

  type CourseRaw = { name: string } | null;
  const courseName = (assessmentRow.courses as unknown as CourseRaw)?.name ?? "";
  const questions = assessmentRow.questions as unknown as QuizQuestion[];

  return (
    <div>
      <QuizPlayer
        assessmentId={assessmentRow.id}
        questions={questions}
        weekLabel={assessmentRow.week_label}
        topic={assessmentRow.topic}
        courseName={courseName}
      />
    </div>
  );
}
