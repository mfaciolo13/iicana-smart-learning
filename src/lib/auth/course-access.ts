import { and, eq } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { courses, enrollments, grades, teachers } from "@/lib/drizzle/schema";
import { getServerUser } from "./helpers";
import type { UserRole } from "./helpers";

/**
 * Un profesor solo puede escribir sobre los cursos que dicta. Dirección y
 * administrativo no tienen esa restricción. Estas funciones lanzan "No autorizado"
 * (igual que requireRole) para que una Server Action invocada a mano con IDs
 * ajenos no pueda mutar datos de otro docente.
 *
 * Llamarlas siempre DESPUÉS de requireRole(), pasando el rol que ésta devuelve.
 */

export async function assertCourseAccess(role: UserRole, courseId: string): Promise<void> {
  if (role !== "profesor") return;

  const user = await getServerUser();
  if (!user) throw new Error("No autorizado");

  const [owned] = await db
    .select({ id: courses.id })
    .from(courses)
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .where(and(eq(courses.id, courseId), eq(teachers.profileId, user.id)))
    .limit(1);

  if (!owned) throw new Error("No autorizado");
}

export async function assertEnrollmentAccess(role: UserRole, enrollmentId: string): Promise<void> {
  if (role !== "profesor") return;

  const [enrollment] = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment) throw new Error("No autorizado");
  await assertCourseAccess(role, enrollment.courseId);
}

export async function assertGradeAccess(role: UserRole, gradeId: string): Promise<void> {
  if (role !== "profesor") return;

  const [grade] = await db
    .select({ enrollmentId: grades.enrollmentId })
    .from(grades)
    .where(eq(grades.id, gradeId))
    .limit(1);

  if (!grade) throw new Error("No autorizado");
  await assertEnrollmentAccess(role, grade.enrollmentId);
}
