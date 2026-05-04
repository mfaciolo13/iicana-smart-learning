import { db } from "@/lib/drizzle";
import { enrollments, students, courses, profiles, teachers } from "@/lib/drizzle/schema";
import { eq, and, ilike, or, count } from "drizzle-orm";
import type { CreateEnrollmentInput, UpdateEnrollmentInput } from "../schemas";
import type { EnrollmentListItem, EnrollmentWithDetails } from "../types";

export async function getEnrollments(search?: string): Promise<EnrollmentListItem[]> {
  const studentProfiles = db
    .$with("student_profiles")
    .as(
      db
        .select({
          studentId: students.id,
          fullName: profiles.fullName,
          dni: students.dni,
          email: profiles.email,
        })
        .from(students)
        .innerJoin(profiles, eq(students.profileId, profiles.id))
    );

  const rows = await db
    .with(studentProfiles)
    .select({
      id: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      status: enrollments.status,
      studentName: studentProfiles.fullName,
      studentDni: studentProfiles.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(enrollments)
    .innerJoin(studentProfiles, eq(enrollments.studentId, studentProfiles.studentId))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(
      search
        ? or(
            ilike(studentProfiles.fullName, `%${search}%`),
            ilike(courses.name, `%${search}%`),
            ilike(studentProfiles.dni, `%${search}%`)
          )
        : undefined
    )
    .orderBy(enrollments.enrolledAt);

  return rows as EnrollmentListItem[];
}

export async function getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
  const rows = await db
    .select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      courseId: enrollments.courseId,
      enrolledAt: enrollments.enrolledAt,
      status: enrollments.status,
      student: {
        fullName: profiles.fullName,
        email: profiles.email,
        dni: students.dni,
      },
      course: {
        name: courses.name,
        level: courses.level,
        schedule: courses.schedule,
      },
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.id, id))
    .limit(1);

  return (rows[0] as EnrollmentWithDetails) ?? null;
}

export async function getEnrollmentsByCourse(courseId: string): Promise<EnrollmentListItem[]> {
  const rows = await db
    .select({
      id: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      status: enrollments.status,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.courseId, courseId))
    .orderBy(profiles.fullName);

  return rows as EnrollmentListItem[];
}

export async function getEnrollmentsByStudent(studentId: string): Promise<EnrollmentListItem[]> {
  const rows = await db
    .select({
      id: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      status: enrollments.status,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(enrollments.enrolledAt);

  return rows as EnrollmentListItem[];
}

export async function getEnrollmentsByTeacherProfile(teacherProfileId: string): Promise<EnrollmentListItem[]> {
  const rows = await db
    .select({
      id: enrollments.id,
      enrolledAt: enrollments.enrolledAt,
      status: enrollments.status,
      studentName: profiles.fullName,
      studentDni: students.dni,
      courseName: courses.name,
      courseLevel: courses.level,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(teachers, eq(courses.teacherId, teachers.id))
    .where(and(eq(teachers.profileId, teacherProfileId), eq(enrollments.status, "active")))
    .orderBy(courses.name, profiles.fullName);

  return rows as EnrollmentListItem[];
}

export async function validateAndCreateEnrollment(input: CreateEnrollmentInput) {
  // Check for duplicate active enrollment
  const existing = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, input.studentId),
        eq(enrollments.courseId, input.courseId),
        eq(enrollments.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { error: "El alumno ya está inscripto en este curso" };
  }

  // Check course capacity
  const [course] = await db
    .select({ maxCapacity: courses.maxCapacity })
    .from(courses)
    .where(eq(courses.id, input.courseId))
    .limit(1);

  if (!course) return { error: "Curso no encontrado" };

  const [{ total }] = await db
    .select({ total: count() })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, input.courseId),
        eq(enrollments.status, "active")
      )
    );

  if (total >= course.maxCapacity) {
    return { error: `El curso alcanzó el cupo máximo de ${course.maxCapacity} alumnos` };
  }

  const [enrollment] = await db
    .insert(enrollments)
    .values({
      studentId: input.studentId,
      courseId: input.courseId,
      status: "active",
    })
    .returning();

  return { enrollment };
}

export async function updateEnrollment(input: UpdateEnrollmentInput) {
  const [updated] = await db
    .update(enrollments)
    .set({ status: input.status })
    .where(eq(enrollments.id, input.id))
    .returning();
  return updated;
}

export async function deleteEnrollment(id: string) {
  await db.delete(enrollments).where(eq(enrollments.id, id));
}
