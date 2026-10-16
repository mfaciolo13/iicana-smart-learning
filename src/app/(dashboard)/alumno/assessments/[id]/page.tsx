import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { assessments, assessmentAttempts, courses } from "@/lib/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { QuizPlayer } from "@/modules/assessments/components/QuizPlayer";
import { isStudentEnrolledInCourse } from "@/modules/assessments/services/assessments.service";
import type { QuizQuestion, PublicQuizQuestion } from "@/modules/assessments/types";

export default async function AlumnoAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect("/login");

  const [assessmentRows, attemptRows] = await Promise.all([
    db
      .select({
        id: assessments.id,
        weekLabel: assessments.weekLabel,
        topic: assessments.topic,
        status: assessments.status,
        questions: assessments.questions,
        courseId: assessments.courseId,
        courseName: courses.name,
      })
      .from(assessments)
      .innerJoin(courses, eq(assessments.courseId, courses.id))
      .where(eq(assessments.id, id))
      .limit(1),
    db
      .select({ id: assessmentAttempts.id })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.assessmentId, id),
          eq(assessmentAttempts.studentId, user.id)
        )
      )
      .limit(1),
  ]);

  const assessmentRow = assessmentRows[0];
  if (!assessmentRow || assessmentRow.status !== "published") notFound();

  // SCRUM-360: la pantalla sólo miraba que estuviera publicada, así que cambiando el id
  // en la URL se podía leer el enunciado de un curso ajeno. Las actions ya exigían la
  // inscripción al responder; acá se valida antes de mostrar nada.
  if (!(await isStudentEnrolledInCourse(user.id, assessmentRow.courseId))) notFound();

  if (attemptRows.length > 0) redirect(`/alumno/assessments/${id}/resultado`);

  // Al navegador sólo viaja el enunciado y las opciones: la corrección se hace en el servidor (SCRUM-301).
  const questions: PublicQuizQuestion[] = (assessmentRow.questions as unknown as QuizQuestion[]).map((q) => ({
    question: q.question,
    options: q.options,
  }));

  return (
    <div>
      <QuizPlayer
        assessmentId={assessmentRow.id}
        questions={questions}
        weekLabel={assessmentRow.weekLabel}
        topic={assessmentRow.topic}
        courseName={assessmentRow.courseName}
      />
    </div>
  );
}
