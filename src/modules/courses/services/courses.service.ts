import { db } from "@/lib/drizzle";
import { courses, teachers, profiles, enrollments, students } from "@/lib/drizzle/schema";
import { alias } from "drizzle-orm/pg-core";
import { eq, ilike, sql, and } from "drizzle-orm";
import type { CreateCourseInput, UpdateCourseInput } from "../schemas";
import type { CourseListItem, CourseWithTeacher, StudentCourse } from "../types";
import { formatSchedule } from "../lib/schedule";

export async function getCourses(search?: string): Promise<CourseListItem[]> {
  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      level: courses.level,
      schedule: courses.schedule,
      status: courses.status,
      maxCapacity: courses.maxCapacity,
      teacherName: profiles.fullName,
      enrollmentCount: sql<number>`cast(count(${enrollments.id}) as int)`,
    })
    .from(courses)
    .leftJoin(teachers, eq(courses.teacherId, teachers.id))
    .leftJoin(profiles, eq(teachers.profileId, profiles.id))
    .leftJoin(
      enrollments,
      sql`${enrollments.courseId} = ${courses.id} AND ${enrollments.status} = 'active'`
    )
    .where(search ? ilike(courses.name, `%${search}%`) : undefined)
    .groupBy(courses.id, profiles.fullName)
    .orderBy(courses.name);

  return rows as CourseListItem[];
}

export async function getCoursesByTeacherProfile(profileId: string): Promise<CourseListItem[]> {
  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      level: courses.level,
      schedule: courses.schedule,
      status: courses.status,
      maxCapacity: courses.maxCapacity,
      teacherName: profiles.fullName,
      enrollmentCount: sql<number>`cast(count(${enrollments.id}) as int)`,
    })
    .from(courses)
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .leftJoin(profiles, eq(teachers.profileId, profiles.id))
    .leftJoin(
      enrollments,
      sql`${enrollments.courseId} = ${courses.id} AND ${enrollments.status} = 'active'`
    )
    .where(and(eq(teachers.profileId, profileId), eq(courses.status, "active")))
    .groupBy(courses.id, profiles.fullName)
    .orderBy(courses.name);

  return rows as CourseListItem[];
}

/** Cursos en los que el alumno (por profile) tiene una inscripción activa. */
export async function getCoursesByStudentProfile(profileId: string): Promise<StudentCourse[]> {
  const teacherProfiles = alias(profiles, "teacher_profiles");
  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      level: courses.level,
      schedule: courses.schedule,
      classroom: courses.classroom,
      status: courses.status,
      teacherName: teacherProfiles.fullName,
      teacherEmail: teacherProfiles.email,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(teachers, eq(courses.teacherId, teachers.id))
    .leftJoin(teacherProfiles, eq(teachers.profileId, teacherProfiles.id))
    .where(and(eq(students.profileId, profileId), eq(enrollments.status, "active")))
    .orderBy(courses.name);

  return rows as StudentCourse[];
}

export async function getCourseById(id: string): Promise<CourseWithTeacher | null> {
  const rows = await db
    .select({
      id: courses.id,
      name: courses.name,
      level: courses.level,
      schedule: courses.schedule,
      classDays: courses.classDays,
      classTime: courses.classTime,
      classDurationMinutes: courses.classDurationMinutes,
      classroom: courses.classroom,
      maxCapacity: courses.maxCapacity,
      diagnosticFrequency: courses.diagnosticFrequency,
      status: courses.status,
      teacherId: courses.teacherId,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      teacher: {
        fullName: profiles.fullName,
        email: profiles.email,
      },
      enrollmentCount: sql<number>`cast(count(${enrollments.id}) as int)`,
    })
    .from(courses)
    .leftJoin(teachers, eq(courses.teacherId, teachers.id))
    .leftJoin(profiles, eq(teachers.profileId, profiles.id))
    .leftJoin(
      enrollments,
      sql`${enrollments.courseId} = ${courses.id} AND ${enrollments.status} = 'active'`
    )
    .where(eq(courses.id, id))
    .groupBy(courses.id, profiles.fullName, profiles.email)
    .limit(1);

  if (!rows[0]) return null;

  return {
    ...rows[0],
    teacher: rows[0].teacher?.fullName ? rows[0].teacher : null,
  } as CourseWithTeacher;
}

export async function createCourse(input: CreateCourseInput) {
  const [course] = await db
    .insert(courses)
    .values({
      name: input.name,
      level: input.level,
      schedule: formatSchedule(input.classDays, input.classTime, input.classDurationMinutes),
      classDays: input.classDays,
      classTime: input.classTime,
      classDurationMinutes: input.classDurationMinutes,
      classroom: input.classroom ?? null,
      maxCapacity: input.maxCapacity ?? 15,
      teacherId: input.teacherId ?? null,
      diagnosticFrequency: input.diagnosticFrequency ?? 0,
      status: "active",
    })
    .returning();
  return course;
}

export async function updateCourse(input: UpdateCourseInput) {
  const { id, classDays, classTime, classDurationMinutes, ...data } = input;

  const scheduleFields =
    classDays && classTime && classDurationMinutes !== undefined
      ? {
          classDays,
          classTime,
          classDurationMinutes,
          schedule: formatSchedule(classDays, classTime, classDurationMinutes),
        }
      : {};

  const [updated] = await db
    .update(courses)
    // "" (campo vaciado en el formulario) limpia el aula.
    .set({ ...data, ...(data.classroom === "" ? { classroom: null } : {}), ...scheduleFields, updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning();
  return updated;
}

export async function deleteCourse(id: string) {
  await db.delete(courses).where(eq(courses.id, id));
}
