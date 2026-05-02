import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/helpers";
import {
  getAssessmentDetail,
  getAttemptResult,
} from "@/modules/assessments/services/assessments.service";
import { QuizPlayer } from "@/modules/assessments/components/QuizPlayer";
import type { QuizQuestion } from "@/modules/assessments/types";

export default async function AlumnoAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const assessment = await getAssessmentDetail(id);
  if (!assessment || assessment.status !== "published") notFound();

  // Redirect to result if already attempted
  const existing = await getAttemptResult(id, user.id);
  if (existing) redirect(`/alumno/assessments/${id}/resultado`);

  const questions = assessment.questions as QuizQuestion[];

  return (
    <div>
      <QuizPlayer
        assessmentId={assessment.id}
        questions={questions}
        weekLabel={assessment.weekLabel}
        topic={assessment.topic}
        courseName={assessment.courseName}
      />
    </div>
  );
}
