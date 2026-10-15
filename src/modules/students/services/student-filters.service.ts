import { and, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { courses, enrollments, payments } from "@/lib/drizzle/schema";
import { todayInstitute } from "@/lib/validation";

/** Cursos activos, para el filtro "Curso" de los listados. */
export async function listActiveCourseOptions(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: courses.id, name: courses.name }).from(courses).where(eq(courses.status, "active")).orderBy(courses.name);
}

/** Alumnos con una inscripción activa en el curso. */
export async function getStudentIdsInCourse(courseId: string): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active")));
  return new Set(rows.map((r) => r.studentId));
}

/**
 * Alumnos con deuda vencida: cuotas sin cobrar con vencimiento anterior a hoy, más las
 * suspendidas (mismo criterio que el reporte de morosidad, SCRUM-285).
 */
export async function getStudentIdsWithDebt(): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ studentId: payments.studentId })
    .from(payments)
    .where(
      and(
        inArray(payments.status, ["pending", "overdue", "suspended"]),
        or(lt(payments.dueDate, todayInstitute()), eq(payments.status, "suspended"))
      )
    );
  return new Set(rows.map((r) => r.studentId));
}
