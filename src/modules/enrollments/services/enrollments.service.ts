import { db, dbTx } from "@/lib/drizzle";
import { enrollments, students, courses, profiles, teachers } from "@/lib/drizzle/schema";
import { eq, ne, and, ilike, or, count, inArray } from "drizzle-orm";
import { isUniqueViolation } from "@/lib/db-errors";
import type { CreateEnrollmentInput, UpdateEnrollmentInput } from "../schemas";
import type { EnrollmentListItem, EnrollmentWithDetails } from "../types";
import { schedulesOverlap } from "@/modules/courses/lib/overlap";

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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Reglas de negocio para que un alumno tenga una inscripción ACTIVA en un curso:
 * duplicado, cupo y superposición de horario. Se usa tanto al inscribir como al
 * reactivar (SCRUM-244). Debe ejecutarse dentro de una transacción.
 *
 * Bloquea la fila del curso primero: serializa todos los intentos concurrentes sobre
 * este curso, así el chequeo de cupo no puede ser burlado por una race condition (dos
 * requests leyendo el mismo "total" antes de que cualquiera escriba).
 */
async function checkActiveEnrollmentRules(
  tx: Tx,
  studentId: string,
  courseId: string,
  excludeEnrollmentId?: string,
): Promise<{ error: string } | null> {
  const [course] = await tx
    .select({ maxCapacity: courses.maxCapacity, schedule: courses.schedule, status: courses.status })
    .from(courses)
    .where(eq(courses.id, courseId))
    .for("update");

  if (!course) return { error: "Curso no encontrado" };
  // SCRUM-321: un curso inactivo o completado no admite inscripciones nuevas.
  if (course.status !== "active") return { error: "El curso no está activo: no admite inscripciones" };

  const [student] = await tx
    .select({ status: students.status, accessRestricted: students.accessRestricted })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!student) return { error: "Alumno no encontrado" };
  if (student.status === "suspended" || student.accessRestricted) {
    return { error: "El alumno tiene deuda pendiente: regularizá antes de inscribir" };
  }
  if (student.status === "inactive" || student.status === "graduated") {
    return { error: "El alumno está inactivo o egresado: reactivalo antes de inscribirlo" };
  }

  const notSelf = excludeEnrollmentId ? ne(enrollments.id, excludeEnrollmentId) : undefined;

  const existing = await tx
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active"),
        notSelf,
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { error: "El alumno ya está inscripto en este curso" };
  }

  const [{ total }] = await tx
    .select({ total: count() })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "active"),
        notSelf,
      )
    );

  if (total >= course.maxCapacity) {
    return { error: `El curso alcanzó el cupo máximo de ${course.maxCapacity} alumnos` };
  }

  const activeEnrollments = await tx
    .select({ schedule: courses.schedule, courseName: courses.name })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.status, "active"), notSelf));

  const conflict = activeEnrollments.find((e) => schedulesOverlap(course.schedule, e.schedule));
  if (conflict) {
    return { error: `El horario se superpone con el curso "${conflict.courseName}"` };
  }

  return null;
}

export async function validateAndCreateEnrollment(input: CreateEnrollmentInput) {
  try {
    return await dbTx.transaction(async (tx) => {
      const violation = await checkActiveEnrollmentRules(tx, input.studentId, input.courseId);
      if (violation) return violation;

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

export async function updateEnrollment(
  input: UpdateEnrollmentInput,
): Promise<{ error: string } | { enrollment: typeof enrollments.$inferSelect }> {
  try {
    return await dbTx.transaction(async (tx) => {
      const [current] = await tx.select().from(enrollments).where(eq(enrollments.id, input.id)).limit(1);
      if (!current) return { error: "Inscripción no encontrada" };

      // Reactivar una inscripción retirada/finalizada tiene que respetar las mismas
      // reglas que una inscripción nueva (SCRUM-244).
      if (input.status === "active" && current.status !== "active") {
        const violation = await checkActiveEnrollmentRules(tx, current.studentId, current.courseId, current.id);
        if (violation) return violation;
      }

      const [enrollment] = await tx
        .update(enrollments)
        .set({ status: input.status })
        .where(eq(enrollments.id, input.id))
        .returning();
      return { enrollment };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "El alumno ya está inscripto en este curso" };
    }
    throw err;
  }
}

export async function deleteEnrollment(id: string) {
  await db.delete(enrollments).where(eq(enrollments.id, id));
}

/**
 * Alumnos con inscripción activa en el curso cuyo horario chocaría con `schedule` por otro curso activo
 * suyo. Se usa al cambiar el horario de un curso: la regla de superposición también rige ahí.
 */
export async function findScheduleConflictsForCourse(courseId: string, schedule: string): Promise<{ studentName: string; otherCourse: string }[]> {
  const mine = await db
    .select({ studentId: enrollments.studentId, studentName: profiles.fullName })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active")));
  if (mine.length === 0) return [];

  const others = await db
    .select({ studentId: enrollments.studentId, courseName: courses.name, schedule: courses.schedule })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(inArray(enrollments.studentId, mine.map((m) => m.studentId)), eq(enrollments.status, "active"), ne(enrollments.courseId, courseId)));

  const conflicts: { studentName: string; otherCourse: string }[] = [];
  for (const o of others) {
    if (schedulesOverlap(schedule, o.schedule)) {
      conflicts.push({ studentName: mine.find((m) => m.studentId === o.studentId)!.studentName, otherCourse: o.courseName });
    }
  }
  return conflicts;
}
