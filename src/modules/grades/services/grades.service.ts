import { db } from "@/lib/drizzle";
import { grades, enrollments, students, courses, profiles, teachers } from "@/lib/drizzle/schema";
import { eq, desc, avg, count, inArray } from "drizzle-orm";
import type { CreateGradeInput, UpdateGradeInput } from "../schemas";
import type { GradeWithDetails } from "../types";

export async function getGrades(courseId?: string): Promise<GradeWithDetails[]> {
  const query = db
    .select({
      id: grades.id,
      enrollmentId: grades.enrollmentId,
      evaluationType: grades.evaluationType,
      score: grades.score,
      evaluatedAt: grades.evaluatedAt,
      notes: grades.notes,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .orderBy(desc(grades.evaluatedAt));

  const rows = courseId
    ? await query.where(eq(enrollments.courseId, courseId))
    : await query;

  return rows as GradeWithDetails[];
}

export async function getGradesByStudent(studentId: string): Promise<GradeWithDetails[]> {
  const rows = await db
    .select({
      id: grades.id,
      enrollmentId: grades.enrollmentId,
      evaluationType: grades.evaluationType,
      score: grades.score,
      evaluatedAt: grades.evaluatedAt,
      notes: grades.notes,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(grades.evaluatedAt));

  return rows as GradeWithDetails[];
}

export async function getGradeById(id: string): Promise<GradeWithDetails | null> {
  const rows = await db
    .select({
      id: grades.id,
      enrollmentId: grades.enrollmentId,
      evaluationType: grades.evaluationType,
      score: grades.score,
      evaluatedAt: grades.evaluatedAt,
      notes: grades.notes,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(grades.id, id))
    .limit(1);

  return (rows[0] as GradeWithDetails) ?? null;
}

export async function createGrade(input: CreateGradeInput) {
  const [grade] = await db
    .insert(grades)
    .values({
      enrollmentId: input.enrollmentId,
      evaluationType: input.evaluationType,
      score: String(input.score),
      notes: input.notes ?? null,
    })
    .returning();
  return grade;
}

export async function updateGrade(input: UpdateGradeInput) {
  const { id, ...data } = input;
  const [updated] = await db
    .update(grades)
    .set({
      ...data,
      score: data.score !== undefined ? String(data.score) : undefined,
    })
    .where(eq(grades.id, id))
    .returning();
  return updated;
}

export async function deleteGrade(id: string) {
  await db.delete(grades).where(eq(grades.id, id));
}

export async function getGradesByTeacherProfile(teacherProfileId: string): Promise<GradeWithDetails[]> {
  const rows = await db
    .select({
      id: grades.id,
      enrollmentId: grades.enrollmentId,
      evaluationType: grades.evaluationType,
      score: grades.score,
      evaluatedAt: grades.evaluatedAt,
      notes: grades.notes,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(grades)
    .innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .where(eq(teachers.profileId, teacherProfileId))
    .orderBy(desc(grades.evaluatedAt));

  return rows as GradeWithDetails[];
}
