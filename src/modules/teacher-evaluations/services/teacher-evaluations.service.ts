import { db } from "@/lib/drizzle";
import {
  teacherSurveys,
  classObservations,
  enrollments,
  courses,
  teachers,
  profiles,
  students,
} from "@/lib/drizzle/schema";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import type {
  EnrollmentForSurvey,
  TeacherSurveyInput,
  ClassObservationInput,
  TeacherEvalSummary,
  TeacherSurveyAggregate,
  ClassObservationDetail,
} from "../types";

export async function getEnrollmentsForSurvey(studentId: string): Promise<EnrollmentForSurvey[]> {
  const teacherProfiles = db
    .$with("teacher_profiles")
    .as(
      db
        .select({ teacherId: teachers.id, fullName: profiles.fullName })
        .from(teachers)
        .innerJoin(profiles, eq(teachers.profileId, profiles.id))
    );

  const rows = await db
    .with(teacherProfiles)
    .select({
      enrollmentId: enrollments.id,
      courseId: courses.id,
      courseName: courses.name,
      courseLevel: courses.level,
      teacherId: courses.teacherId,
      teacherName: teacherProfiles.fullName,
      surveyId: teacherSurveys.id,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(teacherProfiles, eq(courses.teacherId, teacherProfiles.teacherId))
    .leftJoin(teacherSurveys, eq(teacherSurveys.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.status, "active")));

  return rows.map((r) => ({
    ...r,
    teacherId: r.teacherId ?? null,
    teacherName: r.teacherName ?? null,
    surveyId: r.surveyId ?? null,
  })) as EnrollmentForSurvey[];
}

export async function submitSurvey(input: TeacherSurveyInput) {
  const [survey] = await db
    .insert(teacherSurveys)
    .values({
      teacherId: input.teacherId,
      courseId: input.courseId,
      enrollmentId: input.enrollmentId ?? null,
      rating1: input.rating1,
      rating2: input.rating2,
      rating3: input.rating3,
      rating4: input.rating4,
      comment: input.comment ?? null,
    })
    .returning();
  return survey;
}

export async function hasSurveySubmitted(enrollmentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: teacherSurveys.id })
    .from(teacherSurveys)
    .where(eq(teacherSurveys.enrollmentId, enrollmentId))
    .limit(1);
  return !!row;
}

export async function createObservation(input: ClassObservationInput, observedBy: string) {
  const [obs] = await db
    .insert(classObservations)
    .values({
      teacherId: input.teacherId,
      courseId: input.courseId,
      observedBy,
      observedAt: input.observedAt,
      overallRating: input.overallRating,
      observations: input.observations,
      strengths: input.strengths ?? null,
      improvements: input.improvements ?? null,
    })
    .returning();
  return obs;
}

export async function getTeacherEvalSummaries(): Promise<TeacherEvalSummary[]> {
  const rows = await db
    .select({
      teacherId: teachers.id,
      teacherName: profiles.fullName,
      surveyCount: sql<number>`cast(count(distinct ${teacherSurveys.id}) as int)`,
      avgRating: sql<number | null>`
        case when count(distinct ${teacherSurveys.id}) = 0 then null
        else round(avg((${teacherSurveys.rating1} + ${teacherSurveys.rating2} + ${teacherSurveys.rating3} + ${teacherSurveys.rating4}) / 4.0), 1)
        end`,
      observationCount: sql<number>`cast(count(distinct ${classObservations.id}) as int)`,
      lastObservedAt: sql<string | null>`max(${classObservations.observedAt})`,
    })
    .from(teachers)
    .innerJoin(profiles, eq(teachers.profileId, profiles.id))
    .leftJoin(teacherSurveys, eq(teacherSurveys.teacherId, teachers.id))
    .leftJoin(classObservations, eq(classObservations.teacherId, teachers.id))
    .groupBy(teachers.id, profiles.fullName)
    .orderBy(profiles.fullName);

  return rows as TeacherEvalSummary[];
}

export async function getTeacherSurveyAggregate(teacherId: string): Promise<TeacherSurveyAggregate | null> {
  const [agg] = await db
    .select({
      avg1: sql<number>`round(avg(${teacherSurveys.rating1}), 1)`,
      avg2: sql<number>`round(avg(${teacherSurveys.rating2}), 1)`,
      avg3: sql<number>`round(avg(${teacherSurveys.rating3}), 1)`,
      avg4: sql<number>`round(avg(${teacherSurveys.rating4}), 1)`,
      total: sql<number>`cast(count(*) as int)`,
    })
    .from(teacherSurveys)
    .where(eq(teacherSurveys.teacherId, teacherId));

  if (!agg || agg.total === 0) return null;

  const comments = await db
    .select({ comment: teacherSurveys.comment })
    .from(teacherSurveys)
    .where(and(eq(teacherSurveys.teacherId, teacherId), isNotNull(teacherSurveys.comment)))
    .orderBy(teacherSurveys.createdAt)
    .limit(5);

  return {
    avg1: Number(agg.avg1),
    avg2: Number(agg.avg2),
    avg3: Number(agg.avg3),
    avg4: Number(agg.avg4),
    total: agg.total,
    recentComments: comments.map((c) => c.comment!),
  };
}

export async function getTeacherObservations(teacherId: string): Promise<ClassObservationDetail[]> {
  const observerProfiles = db
    .$with("observer_profiles")
    .as(
      db
        .select({ profileId: profiles.id, fullName: profiles.fullName })
        .from(profiles)
    );

  const rows = await db
    .with(observerProfiles)
    .select({
      id: classObservations.id,
      observedAt: classObservations.observedAt,
      overallRating: classObservations.overallRating,
      observations: classObservations.observations,
      strengths: classObservations.strengths,
      improvements: classObservations.improvements,
      observerName: observerProfiles.fullName,
      courseName: courses.name,
    })
    .from(classObservations)
    .innerJoin(courses, eq(classObservations.courseId, courses.id))
    .leftJoin(observerProfiles, eq(classObservations.observedBy, observerProfiles.profileId))
    .where(eq(classObservations.teacherId, teacherId))
    .orderBy(classObservations.observedAt);

  return rows.map((r) => ({ ...r, observerName: r.observerName ?? "—" })) as ClassObservationDetail[];
}

/**
 * Inscripción activa del alumno (por id de perfil) en el curso, con el docente real del curso.
 * La encuesta se arma con estos datos del servidor, no con los que llegan en el formulario.
 */
export async function getActiveEnrollmentForSurvey(
  studentProfileId: string,
  courseId: string
): Promise<{ enrollmentId: string; teacherId: string } | null> {
  const [row] = await db
    .select({ enrollmentId: enrollments.id, teacherId: courses.teacherId })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      and(
        eq(students.profileId, studentProfileId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active"),
        isNotNull(courses.teacherId)
      )
    )
    .limit(1);
  if (!row || !row.teacherId) return null;
  return { enrollmentId: row.enrollmentId, teacherId: row.teacherId };
}
