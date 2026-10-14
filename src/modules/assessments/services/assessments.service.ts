import { db } from "@/lib/drizzle";
import {
  assessments,
  assessmentAttempts,
  courses,
  enrollments,
  students,
  teachers,
} from "@/lib/drizzle/schema";
import { eq, desc, asc, sql, and, inArray, gte } from "drizzle-orm";
import { todayInstitute } from "@/lib/validation";
import type {
  AssessmentListItem,
  AssessmentDetail,
  StudentAssessmentItem,
  AttemptResult,
  QuizQuestion,
} from "../types";
import type { GenerateAssessmentInput, SubmitAttemptInput } from "../schemas";

export async function getAssessments(): Promise<AssessmentListItem[]> {
  const rows = await db
    .select({
      id: assessments.id,
      courseId: assessments.courseId,
      courseName: courses.name,
      weekLabel: assessments.weekLabel,
      topic: assessments.topic,
      status: assessments.status,
      questionCount: sql<number>`jsonb_array_length(${assessments.questions})`,
      attemptCount: sql<number>`cast(count(${assessmentAttempts.id}) as int)`,
      createdAt: assessments.createdAt,
    })
    .from(assessments)
    .innerJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(assessmentAttempts, eq(assessmentAttempts.assessmentId, assessments.id))
    .groupBy(assessments.id, courses.name)
    .orderBy(desc(assessments.createdAt));

  return rows as AssessmentListItem[];
}

export async function getAssessmentDetail(id: string): Promise<AssessmentDetail | null> {
  const rows = await db
    .select({
      id: assessments.id,
      courseId: assessments.courseId,
      courseName: courses.name,
      createdBy: assessments.createdBy,
      weekLabel: assessments.weekLabel,
      topic: assessments.topic,
      status: assessments.status,
      questions: assessments.questions,
      attemptCount: sql<number>`cast(count(${assessmentAttempts.id}) as int)`,
      avgScore: sql<number | null>`cast(avg(${assessmentAttempts.score}) as numeric(5,1))`,
      createdAt: assessments.createdAt,
    })
    .from(assessments)
    .innerJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(assessmentAttempts, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(eq(assessments.id, id))
    .groupBy(assessments.id, courses.name)
    .limit(1);

  return (rows[0] as AssessmentDetail) ?? null;
}

export async function getPublishedAssessmentsForStudent(
  studentProfileId: string
): Promise<StudentAssessmentItem[]> {
  // Get courses the student is enrolled in
  const studentRow = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.profileId, studentProfileId))
    .limit(1);

  if (!studentRow[0]) return [];

  const enrolledCourseIds = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(
      and(eq(enrollments.studentId, studentRow[0].id), eq(enrollments.status, "active"))
    );

  if (enrolledCourseIds.length === 0) return [];

  const courseIds = enrolledCourseIds.map((r) => r.courseId);

  // For each published assessment in those courses, get attempt info
  const rows = await db
    .select({
      id: assessments.id,
      courseId: assessments.courseId,
      courseName: courses.name,
      weekLabel: assessments.weekLabel,
      topic: assessments.topic,
      questionCount: sql<number>`jsonb_array_length(${assessments.questions})`,
      attemptId: assessmentAttempts.id,
      attemptScore: assessmentAttempts.score,
      attemptCompletedAt: assessmentAttempts.completedAt,
    })
    .from(assessments)
    .innerJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(
      assessmentAttempts,
      and(
        eq(assessmentAttempts.assessmentId, assessments.id),
        eq(assessmentAttempts.studentId, studentProfileId)
      )
    )
    .where(
      and(
        eq(assessments.status, "published"),
        inArray(assessments.courseId, courseIds)
      )
    )
    .orderBy(desc(assessments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    courseId: r.courseId,
    courseName: r.courseName,
    weekLabel: r.weekLabel,
    topic: r.topic,
    questionCount: r.questionCount,
    attempt: r.attemptId
      ? { id: r.attemptId, score: r.attemptScore!, completedAt: r.attemptCompletedAt! }
      : null,
  })) as StudentAssessmentItem[];
}

export async function getAttemptResult(
  assessmentId: string,
  studentProfileId: string
): Promise<AttemptResult | null> {
  const rows = await db
    .select({
      id: assessmentAttempts.id,
      assessmentId: assessments.id,
      weekLabel: assessments.weekLabel,
      topic: assessments.topic,
      courseName: courses.name,
      questions: assessments.questions,
      answers: assessmentAttempts.answers,
      score: assessmentAttempts.score,
      completedAt: assessmentAttempts.completedAt,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .innerJoin(courses, eq(assessments.courseId, courses.id))
    .where(
      and(
        eq(assessmentAttempts.assessmentId, assessmentId),
        eq(assessmentAttempts.studentId, studentProfileId)
      )
    )
    .limit(1);

  return (rows[0] as AttemptResult) ?? null;
}

export async function createAssessmentDraft(
  input: GenerateAssessmentInput,
  createdBy: string,
  questions: QuizQuestion[]
) {
  const [row] = await db
    .insert(assessments)
    .values({
      courseId: input.courseId,
      createdBy,
      weekLabel: input.weekLabel,
      topic: input.topic,
      status: "draft",
      questions: questions as unknown as typeof assessments.$inferInsert["questions"],
    })
    .returning();
  return row;
}

export async function publishAssessment(id: string) {
  const [row] = await db
    .update(assessments)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(assessments.id, id))
    .returning();
  return row;
}

export async function archiveAssessment(id: string) {
  const [row] = await db
    .update(assessments)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(assessments.id, id))
    .returning();
  return row;
}

export async function getActiveCoursesForTeacher(teacherProfileId: string) {
  const teacherRows = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.profileId, teacherProfileId))
    .limit(1);

  if (!teacherRows[0]) return [];

  return db
    .select({ id: courses.id, name: courses.name, level: courses.level })
    .from(courses)
    .where(and(eq(courses.teacherId, teacherRows[0].id), eq(courses.status, "active")))
    .orderBy(asc(courses.name));
}

export async function getAssessmentsForTeacher(teacherProfileId: string): Promise<AssessmentListItem[]> {
  const teacherRows = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.profileId, teacherProfileId))
    .limit(1);

  if (!teacherRows[0]) return [];

  const courseRows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.teacherId, teacherRows[0].id));

  if (courseRows.length === 0) return [];

  const courseIds = courseRows.map((c) => c.id);

  const rows = await db
    .select({
      id: assessments.id,
      courseId: assessments.courseId,
      courseName: courses.name,
      weekLabel: assessments.weekLabel,
      topic: assessments.topic,
      status: assessments.status,
      questionCount: sql<number>`jsonb_array_length(${assessments.questions})`,
      attemptCount: sql<number>`cast(count(${assessmentAttempts.id}) as int)`,
      createdAt: assessments.createdAt,
    })
    .from(assessments)
    .innerJoin(courses, eq(assessments.courseId, courses.id))
    .leftJoin(assessmentAttempts, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(inArray(assessments.courseId, courseIds))
    .groupBy(assessments.id, courses.name)
    .orderBy(desc(assessments.createdAt));

  return rows as AssessmentListItem[];
}

export async function submitAttempt(
  input: SubmitAttemptInput,
  studentProfileId: string,
  questions: QuizQuestion[]
) {
  const correct = input.answers.filter(
    (ans, i) => questions[i] && ans === questions[i].correct
  ).length;
  const score = Math.round((correct / questions.length) * 100);

  const [row] = await db
    .insert(assessmentAttempts)
    .values({
      assessmentId: input.assessmentId,
      studentId: studentProfileId,
      answers: input.answers as unknown as typeof assessmentAttempts.$inferInsert["answers"],
      score,
    })
    .returning();
  return row;
}

/** El alumno (por id de perfil) tiene una inscripción activa en el curso. */
export async function isStudentEnrolledInCourse(studentProfileId: string, courseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(and(eq(students.profileId, studentProfileId), eq(enrollments.courseId, courseId), eq(enrollments.status, "active")))
    .limit(1);
  return !!row;
}

/** El alumno ya respondió esta autoevaluación. */
export async function hasAttempt(assessmentId: string, studentProfileId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.assessmentId, assessmentId), eq(assessmentAttempts.studentId, studentProfileId)))
    .limit(1);
  return !!row;
}

/** Autoevaluaciones creadas hoy (hora del instituto) para el curso: base de la cuota diaria de IA. */
export async function countAssessmentsToday(courseId: string): Promise<number> {
  const startOfDay = new Date(`${todayInstitute()}T00:00:00-03:00`);
  const [row] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(assessments)
    .where(and(eq(assessments.courseId, courseId), gte(assessments.createdAt, startOfDay)));
  return row?.n ?? 0;
}
