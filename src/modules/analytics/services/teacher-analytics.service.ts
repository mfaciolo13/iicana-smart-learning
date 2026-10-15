import { unstable_cache } from "next/cache";
import { ANALYTICS_TAG } from "@/lib/analytics-cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import {
  assessmentAttempts,
  assessments,
  attendance,
  courses,
  enrollments,
  grades,
  profiles,
  students,
  teachers,
  teacherSurveys,
} from "@/lib/drizzle/schema";

const CACHE_SECONDS = 60;
/** Mínimo de encuestas para mostrarle al docente su promedio: con menos, el promedio delata a quien respondió. */
export const MIN_SURVEYS_FOR_TEACHER = 3;

const EVALUATION_LABELS: Record<string, string> = {
  parcial: "Parcial",
  final: "Final",
  oral: "Oral",
  homework: "Tarea",
  quiz: "Quiz",
};
const GRADE_BUCKETS = ["1–3", "4–5", "6", "7", "8", "9–10"];

export interface TeacherCourse {
  id: string;
  name: string;
  level: string;
  classDays: string[];
  classTime: string;
  enrolled: number;
  capacity: number;
}

/** Cursos activos del docente (por el id de su perfil), con inscriptos activos. */
export async function getTeacherCourses(profileId: string): Promise<TeacherCourse[]> {
  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      level: courses.level,
      classDays: courses.classDays,
      classTime: courses.classTime,
      capacity: courses.maxCapacity,
      enrolled: sql<number>`cast(count(${enrollments.id}) filter (where ${enrollments.status} = 'active') as int)`,
    })
    .from(courses)
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(and(eq(teachers.profileId, profileId), eq(courses.status, "active")))
    .groupBy(courses.id)
    .orderBy(courses.name);
  return rows.map((r) => ({ ...r, classDays: r.classDays as string[] }));
}

export interface TeacherOverview {
  /** Una fila por curso: asistencia (%) y promedio de notas (1-10). */
  perCourse: { curso: string; asistencia: number | null; promedio: number | null }[];
  /** Promedio de las encuestas anónimas del docente, sólo si hay suficientes respuestas. */
  myRatings: { criterio: string; promedio: number }[] | null;
  surveyCount: number;
}

export async function loadOverview(teacherProfileId: string): Promise<TeacherOverview> {
  const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.profileId, teacherProfileId)).limit(1);
  if (!teacher) return { perCourse: [], myRatings: null, surveyCount: 0 };

  const att = await db
    .select({
      courseId: courses.id,
      curso: courses.name,
      total: sql<number>`cast(count(${attendance.id}) as int)`,
      present: sql<number>`cast(count(${attendance.id}) filter (where ${attendance.status} in ('present','late')) as int)`,
    })
    .from(courses)
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .leftJoin(attendance, eq(attendance.enrollmentId, enrollments.id))
    .where(and(eq(courses.teacherId, teacher.id), eq(courses.status, "active")))
    .groupBy(courses.id, courses.name)
    .orderBy(courses.name);

  const gr = await db
    .select({
      courseId: courses.id,
      promedio: sql<string | null>`round(avg(cast(${grades.score} as float))::numeric, 1)::text`,
    })
    .from(courses)
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .innerJoin(grades, eq(grades.enrollmentId, enrollments.id))
    .where(and(eq(courses.teacherId, teacher.id), eq(courses.status, "active")))
    .groupBy(courses.id);

  const [sv] = await db
    .select({
      total: sql<number>`cast(count(*) as int)`,
      a1: sql<string | null>`round(avg(${teacherSurveys.rating1}), 1)::text`,
      a2: sql<string | null>`round(avg(${teacherSurveys.rating2}), 1)::text`,
      a3: sql<string | null>`round(avg(${teacherSurveys.rating3}), 1)::text`,
      a4: sql<string | null>`round(avg(${teacherSurveys.rating4}), 1)::text`,
    })
    .from(teacherSurveys)
    .where(eq(teacherSurveys.teacherId, teacher.id));

  const enough = (sv?.total ?? 0) >= MIN_SURVEYS_FOR_TEACHER;
  return {
    perCourse: att.map((r) => ({
      curso: r.curso,
      asistencia: r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : null,
      promedio: gr.find((g) => g.courseId === r.courseId)?.promedio != null ? Number(gr.find((g) => g.courseId === r.courseId)!.promedio) : null,
    })),
    surveyCount: sv?.total ?? 0,
    myRatings: enough
      ? [
          { criterio: "Claridad al explicar", promedio: Number(sv.a1) },
          { criterio: "Disponibilidad", promedio: Number(sv.a2) },
          { criterio: "Ritmo de la clase", promedio: Number(sv.a3) },
          { criterio: "Recomendación", promedio: Number(sv.a4) },
        ]
      : null,
  };
}

export const getTeacherOverview = (teacherProfileId: string) =>
  unstable_cache(() => loadOverview(teacherProfileId), ["analytics-teacher-overview", teacherProfileId], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] })();

export interface TeacherCourseAnalytics {
  attendanceBySession: { fecha: string; asistencia: number; presentes: number; total: number }[];
  avgByType: { tipo: string; promedio: number }[];
  gradeDistribution: { rango: string; notas: number }[];
  /** Los alumnos con menos asistencia primero (los que necesitan atención). */
  studentAttendance: { alumno: string; asistencia: number }[];
  studentGrades: { alumno: string; promedio: number }[];
  assessments: { evaluacion: string; promedio: number; intentos: number }[];
  /** Alumnos con 2 ausencias seguidas en las últimas clases. */
  atRisk: { alumno: string; motivo: string }[];
}

function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export async function loadCourse(courseId: string): Promise<TeacherCourseAnalytics> {
  const sessionRows = await db
    .select({
      fecha: attendance.classDate,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(count(*) filter (where ${attendance.status} in ('present','late')) as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .where(eq(enrollments.courseId, courseId))
    .groupBy(attendance.classDate)
    .orderBy(desc(attendance.classDate))
    .limit(12);
  const attendanceBySession = sessionRows
    .reverse()
    .map((r) => ({
      fecha: shortDate(r.fecha),
      asistencia: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0,
      presentes: r.present,
      total: r.total,
    }));

  const typeRows = await db
    .select({
      tipo: grades.evaluationType,
      promedio: sql<string>`round(avg(cast(${grades.score} as float))::numeric, 1)::text`,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .where(eq(enrollments.courseId, courseId))
    .groupBy(grades.evaluationType);
  const avgByType = typeRows.map((r) => ({ tipo: EVALUATION_LABELS[r.tipo] ?? r.tipo, promedio: Number(r.promedio) }));

  const distBucket = sql<string>`case
    when cast(${grades.score} as float) < 4 then '1–3'
    when cast(${grades.score} as float) < 6 then '4–5'
    when cast(${grades.score} as float) < 7 then '6'
    when cast(${grades.score} as float) < 8 then '7'
    when cast(${grades.score} as float) < 9 then '8'
    else '9–10' end`;
  const distRows = await db
    .select({ rango: distBucket, notas: sql<number>`cast(count(*) as int)` })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .where(eq(enrollments.courseId, courseId))
    .groupBy(sql`1`);
  const gradeDistribution = GRADE_BUCKETS.map((rango) => ({ rango, notas: distRows.find((r) => r.rango === rango)?.notas ?? 0 }));

  const attStudents = await db
    .select({
      enrollmentId: enrollments.id,
      alumno: profiles.fullName,
      total: sql<number>`cast(count(${attendance.id}) as int)`,
      present: sql<number>`cast(count(${attendance.id}) filter (where ${attendance.status} in ('present','late')) as int)`,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .leftJoin(attendance, eq(attendance.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active")))
    .groupBy(enrollments.id, profiles.fullName);
  const studentAttendance = attStudents
    .filter((r) => r.total > 0)
    .map((r) => ({ alumno: r.alumno, asistencia: Math.round((r.present / r.total) * 100) }))
    .sort((a, b) => a.asistencia - b.asistencia)
    .slice(0, 12);

  const gradeStudents = await db
    .select({
      alumno: profiles.fullName,
      promedio: sql<string>`round(avg(cast(${grades.score} as float))::numeric, 1)::text`,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active")))
    .groupBy(enrollments.id, profiles.fullName);
  const studentGrades = gradeStudents
    .map((r) => ({ alumno: r.alumno, promedio: Number(r.promedio) }))
    .sort((a, b) => a.promedio - b.promedio)
    .slice(0, 12);

  const assessmentRows = await db
    .select({
      evaluacion: assessments.topic,
      intentos: sql<number>`cast(count(${assessmentAttempts.id}) as int)`,
      promedio: sql<string | null>`round(avg(${assessmentAttempts.score}), 0)::text`,
    })
    .from(assessments)
    .leftJoin(assessmentAttempts, eq(assessmentAttempts.assessmentId, assessments.id))
    .where(and(eq(assessments.courseId, courseId), eq(assessments.status, "published")))
    .groupBy(assessments.id, assessments.topic)
    .orderBy(desc(assessments.createdAt))
    .limit(8);
  const assessmentsData = assessmentRows
    .filter((r) => r.intentos > 0 && r.promedio !== null)
    .map((r) => ({ evaluacion: r.evaluacion, promedio: Number(r.promedio), intentos: r.intentos }));

  // Dos ausencias seguidas en las dos últimas clases registradas del curso.
  const lastTwo = sessionRows.slice(0, 2).map((s) => s.fecha);
  let atRisk: TeacherCourseAnalytics["atRisk"] = [];
  if (lastTwo.length === 2) {
    const absent = await db
      .select({
        alumno: profiles.fullName,
        n: sql<number>`cast(count(*) as int)`,
      })
      .from(attendance)
      .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .innerJoin(profiles, eq(students.profileId, profiles.id))
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(attendance.status, "absent"),
          sql`${attendance.classDate} in (${sql.join(lastTwo.map((d) => sql`${d}::date`), sql`, `)})`
        )
      )
      .groupBy(profiles.fullName);
    atRisk = absent.filter((r) => r.n >= 2).map((r) => ({ alumno: r.alumno, motivo: "Faltó a las dos últimas clases" }));
  }

  return { attendanceBySession, avgByType, gradeDistribution, studentAttendance, studentGrades, assessments: assessmentsData, atRisk };
}

export const getTeacherCourseAnalytics = (courseId: string) =>
  unstable_cache(() => loadCourse(courseId), ["analytics-teacher-course", courseId], { revalidate: CACHE_SECONDS, tags: [ANALYTICS_TAG] })();
