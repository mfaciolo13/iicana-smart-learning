import { db } from "@/lib/drizzle";
import { enrollments, students, courses, profiles, teachers } from "@/lib/drizzle/schema";
import { eq, and, ilike, or, count } from "drizzle-orm";
import { isUniqueViolation } from "@/lib/db-errors";
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

function parseScheduleMinutes(schedule: string): { days: string[]; start: number; end: number } | null {
  const spaceIdx = schedule.lastIndexOf(" ");
  if (spaceIdx === -1) return null;
  const daysPart = schedule.slice(0, spaceIdx);
  const timesPart = schedule.slice(spaceIdx + 1);
  const days = daysPart.split("/").filter(Boolean);
  const sep = timesPart.includes("–") ? "–" : "-";
  const parts = timesPart.split(sep).map((t) => t.trim());
  if (parts.length !== 2) return null;
  const toMin = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return parseInt(h) * 60 + parseInt(m);
  };
  return { days, start: toMin(parts[0]), end: toMin(parts[1]) };
}

function schedulesOverlap(a: string, b: string): boolean {
  const pa = parseScheduleMinutes(a);
  const pb = parseScheduleMinutes(b);
  if (!pa || !pb) return false;
  if (!pa.days.some((d) => pb.days.includes(d))) return false;
  return pa.start < pb.end && pb.start < pa.end;
}

export async function validateAndCreateEnrollment(input: CreateEnrollmentInput) {
  try {
    return await db.transaction(async (tx) => {
      // Lock the course row first: serializa todos los intentos de inscripción concurrentes
      // a este mismo curso, así el chequeo de cupo de abajo no puede ser burlado por una
      // race condition (dos requests leyendo el mismo "total" antes de que cualquiera inserte).
      const [course] = await tx
        .select({ maxCapacity: courses.maxCapacity, schedule: courses.schedule, name: courses.name })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .for("update");

      if (!course) return { error: "Curso no encontrado" };

      // Check for duplicate active enrollment
      const existing = await tx
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

      // Check course capacity — ahora race-free gracias al lock de arriba
      const [{ total }] = await tx
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

      // Check schedule conflicts with student's other active enrollments
      const activeEnrollments = await tx
        .select({ schedule: courses.schedule, courseName: courses.name })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.status, "active")));

      const conflict = activeEnrollments.find((e) => schedulesOverlap(course.schedule, e.schedule));
      if (conflict) {
        return { error: `El horario se superpone con el curso "${conflict.courseName}"` };
      }

      const [enrollment] = await tx
        .insert(enrollments)
        .values({
          studentId: input.studentId,
          courseId: input.courseId,
          status: "active",
        })
        .returning();

      return { enrollment };
    });
  } catch (err) {
    // Red de seguridad final: el índice único parcial de la migración 0011 rechaza
    // cualquier duplicado que igual llegara a pasar (ej. si el lock de curso no aplicara).
    if (isUniqueViolation(err)) {
      return { error: "El alumno ya está inscripto en este curso" };
    }
    throw err;
  }
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
