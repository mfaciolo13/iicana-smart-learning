import { unstable_cache } from "next/cache";
import { ANALYTICS_TAG } from "@/lib/analytics-cache";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  assessmentAttempts,
  assessments,
  attendance,
  courses,
  enrollments,
  grades,
  payments,
  teacherSurveySubmissions,
} from "@/lib/drizzle/schema";
import { todayInstitute } from "@/lib/validation";
import { fillMonths, lastMonths, windowStart } from "../lib/months";

const CACHE_SECONDS = 30;
const EVALUATION_LABELS: Record<string, string> = { parcial: "Parcial", final: "Final", oral: "Oral", homework: "Tarea", quiz: "Quiz" };

export interface StudentProgress {
  courses: { id: string; name: string; classDays: string[]; classTime: string }[];
  attendance: { pct: number | null; present: number; total: number };
  attendanceByMonth: { mes: string; asistencia: number | null }[];
  /** Mis últimas notas en orden cronológico. */
  gradesTimeline: { fecha: string; nota: number; detalle: string }[];
  /** Mi promedio contra el promedio del curso (todos los alumnos). */
  gradesVsCourse: { curso: string; yo: number; curso_promedio: number }[];
  paymentSummary: { pagadas: number; porVencer: number; vencidas: number; proximoVencimiento: string | null };
  /** Puntaje (0-100) de mis autoevaluaciones rendidas. */
  assessmentScores: { evaluacion: string; puntaje: number }[];
  todo: { pendingSurveys: number; pendingAssessments: number };
}

function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export async function loadProgress(studentId: string, userId: string): Promise<StudentProgress> {
  const today = todayInstitute();

  const myCourses = await db
    .select({
      enrollmentId: enrollments.id,
      id: courses.id,
      name: courses.name,
      classDays: courses.classDays,
      classTime: courses.classTime,
      teacherId: courses.teacherId,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.status, "active")));

  const [att] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(count(*) filter (where ${attendance.status} in ('present','late')) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .where(eq(enrollments.studentId, studentId));

  const months = lastMonths(6, today);
  const attMonthRows = await db
    .select({
      m: sql<string>`to_char(${attendance.classDate}, 'YYYY-MM')`,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(count(*) filter (where ${attendance.status} in ('present','late')) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.studentId, studentId), sql`${attendance.classDate} >= ${windowStart(6, today)}::date`))
    .groupBy(sql`1`);
  const attendanceByMonth = fillMonths(
    months,
    attMonthRows.map((r) => ({ m: r.m, asistencia: r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : null })),
    ["asistencia"],
    null
  );

  const timelineRows = await db
    .select({
      score: grades.score,
      evaluatedAt: sql<string>`to_char(${grades.evaluatedAt} at time zone 'America/Argentina/Cordoba', 'YYYY-MM-DD')`,
      type: grades.evaluationType,
      course: courses.name,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(grades.evaluatedAt))
    .limit(12);
  const gradesTimeline = timelineRows
    .reverse()
    .map((r) => ({ fecha: shortDate(r.evaluatedAt), nota: Number(r.score), detalle: `${EVALUATION_LABELS[r.type] ?? r.type} · ${r.course}` }));

  const courseIds = [...new Set(myCourses.map((c) => c.id))];
  let gradesVsCourse: StudentProgress["gradesVsCourse"] = [];
  if (courseIds.length > 0) {
    const avgRows = await db
      .select({
        courseId: courses.id,
        curso: courses.name,
        courseAvg: sql<string>`round(avg(cast(${grades.score} as float))::numeric, 1)::text`,
        myAvg: sql<string | null>`round(avg(cast(${grades.score} as float)) filter (where ${enrollments.studentId} = ${studentId})::numeric, 1)::text`,
      })
      .from(grades)
      .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(inArray(courses.id, courseIds))
      .groupBy(courses.id, courses.name)
      .orderBy(courses.name);
    gradesVsCourse = avgRows
      .filter((r) => r.myAvg !== null)
      .map((r) => ({ curso: r.curso, yo: Number(r.myAvg), curso_promedio: Number(r.courseAvg) }));
  }

  const payRows = await db
    .select({ status: payments.status, dueDate: payments.dueDate })
    .from(payments)
    .where(eq(payments.studentId, studentId));
  let pagadas = 0;
  let porVencer = 0;
  let vencidas = 0;
  let proximo: string | null = null;
  for (const p of payRows) {
    if (p.status === "paid") pagadas++;
    else if (p.status === "cancelled") continue;
    else if (p.status === "suspended" || p.dueDate < today) vencidas++;
    else {
      porVencer++;
      if (!proximo || p.dueDate < proximo) proximo = p.dueDate;
    }
  }

  const attemptRows = await db
    .select({ topic: assessments.topic, score: assessmentAttempts.score })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(eq(assessmentAttempts.studentId, userId))
    .orderBy(asc(assessmentAttempts.completedAt))
    .limit(10);

  let pendingAssessments = 0;
  if (courseIds.length > 0) {
    const [pend] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(assessments)
      .leftJoin(assessmentAttempts, and(eq(assessmentAttempts.assessmentId, assessments.id), eq(assessmentAttempts.studentId, userId)))
      .where(and(inArray(assessments.courseId, courseIds), eq(assessments.status, "published"), isNull(assessmentAttempts.id)));
    pendingAssessments = pend?.n ?? 0;
  }

  // Encuestas docentes sin responder: inscripciones activas con docente y sin marca de "ya respondió".
  const withTeacher = myCourses.filter((c) => c.teacherId !== null).map((c) => c.enrollmentId);
  let pendingSurveys = 0;
  if (withTeacher.length > 0) {
    const done = await db
      .select({ id: teacherSurveySubmissions.enrollmentId })
      .from(teacherSurveySubmissions)
      .where(inArray(teacherSurveySubmissions.enrollmentId, withTeacher));
    pendingSurveys = withTeacher.length - done.length;
  }

  return {
    courses: myCourses.map((c) => ({ id: c.id, name: c.name, classDays: c.classDays as string[], classTime: c.classTime })),
    attendance: {
      pct: att && att.total > 0 ? Math.round((att.present / att.total) * 1000) / 10 : null,
      present: att?.present ?? 0,
      total: att?.total ?? 0,
    },
    attendanceByMonth,
    gradesTimeline,
    gradesVsCourse,
    paymentSummary: { pagadas, porVencer, vencidas, proximoVencimiento: proximo },
    assessmentScores: attemptRows.map((r) => ({ evaluacion: r.topic, puntaje: r.score })),
    todo: { pendingSurveys, pendingAssessments },
  };
}

export const getStudentProgress = (studentId: string, userId: string) =>
  unstable_cache(() => loadProgress(studentId, userId), ["analytics-student", studentId], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] })();
