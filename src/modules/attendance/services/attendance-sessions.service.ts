import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { attendance, courses, enrollments, teachers } from "@/lib/drizzle/schema";
import type { AttendanceSession } from "../types";

/**
 * Todas las clases con asistencia registrada (una fila por curso y fecha), agregadas en SQL.
 * Antes la pantalla traía los últimos 1500 registros de alumno y mostraba sólo las 30 clases más
 * nuevas: las anteriores no se podían ver (SCRUM-258). `courseIds` limita a ciertos cursos (docente).
 */
export async function getAttendanceSessions(courseIds?: string[]): Promise<AttendanceSession[]> {
  if (courseIds && courseIds.length === 0) return [];

  const rows = await db
    .select({
      classDate: attendance.classDate,
      courseId: courses.id,
      courseName: courses.name,
      total: sql<number>`cast(count(*) as int)`,
      present: sql<number>`cast(count(*) filter (where ${attendance.status} = 'present') as int)`,
      absent: sql<number>`cast(count(*) filter (where ${attendance.status} = 'absent') as int)`,
      late: sql<number>`cast(count(*) filter (where ${attendance.status} = 'late') as int)`,
    })
    .from(attendance)
    .innerJoin(enrollments, eq(attendance.enrollmentId, enrollments.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(courseIds ? inArray(courses.id, courseIds) : undefined)
    .groupBy(attendance.classDate, courses.id, courses.name)
    .orderBy(desc(attendance.classDate), courses.name);

  return rows;
}

/** Ids de los cursos que dicta el docente (todos, activos o no), por el id de su perfil. */
export async function getTeacherCourseIds(profileId: string): Promise<string[]> {
  const rows = await db
    .select({ id: courses.id })
    .from(courses)
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .where(and(eq(teachers.profileId, profileId)));
  return rows.map((r) => r.id);
}
