import { db, dbTx } from "@/lib/drizzle";
import { teachers, profiles, courses } from "@/lib/drizzle/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import type { CreateTeacherInput, UpdateTeacherInput } from "../schemas";
import type { TeacherListItem, TeacherWithProfile } from "../types";

export async function getTeachers(search?: string): Promise<TeacherListItem[]> {
  const rows = await db
    .select({
      id: teachers.id,
      dni: teachers.dni,
      specialization: teachers.specialization,
      fullName: profiles.fullName,
      email: profiles.email,
      // Un docente dado de baja conserva su ficha (evaluaciones, historial) pero su cuenta queda bloqueada.
      deactivated: sql<boolean>`coalesce((select u.banned_until > now() from auth.users u where u.id = ${teachers.profileId}), false)`,
    })
    .from(teachers)
    .innerJoin(profiles, eq(teachers.profileId, profiles.id))
    .where(
      search
        ? or(
            ilike(profiles.fullName, `%${search}%`),
            ilike(profiles.email, `%${search}%`),
            ilike(teachers.dni, `%${search}%`)
          )
        : undefined
    )
    .orderBy(profiles.fullName);

  return rows as TeacherListItem[];
}

export async function getTeacherById(id: string): Promise<TeacherWithProfile | null> {
  const rows = await db
    .select({
      id: teachers.id,
      dni: teachers.dni,
      specialization: teachers.specialization,
      profileId: teachers.profileId,
      createdAt: teachers.createdAt,
      profile: {
        fullName: profiles.fullName,
        email: profiles.email,
        phone: profiles.phone,
      },
    })
    .from(teachers)
    .innerJoin(profiles, eq(teachers.profileId, profiles.id))
    .where(eq(teachers.id, id))
    .limit(1);

  return (rows[0] as TeacherWithProfile) ?? null;
}

// Devuelve true si ya existe un docente con ese DNI (opcionalmente excluyendo
// el propio registro al editar).
export async function dniExists(dni: string, excludeTeacherId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.dni, dni))
    .limit(1);
  if (rows.length === 0) return false;
  return rows[0].id !== excludeTeacherId;
}

export async function createTeacher(profileId: string, input: CreateTeacherInput) {
  const [teacher] = await db
    .insert(teachers)
    .values({
      profileId,
      dni: input.dni,
      specialization: input.specialization ?? null,
    })
    .returning();
  return teacher;
}

export async function updateTeacher(input: Omit<UpdateTeacherInput, "phone"> & { phone?: string | null }) {
  // fullName y phone viven en `profiles`, no en `teachers` (SCRUM-242).
  const { id, fullName, phone, ...rest } = input;
  const teacherData = rest.specialization === "" ? { ...rest, specialization: null } : rest;
  return dbTx.transaction(async (tx) => {
    const [teacher] =
      Object.keys(teacherData).length > 0
        ? await tx.update(teachers).set(teacherData).where(eq(teachers.id, id)).returning()
        : await tx.select().from(teachers).where(eq(teachers.id, id)).limit(1);

    if (teacher && (fullName !== undefined || phone !== undefined)) {
      await tx
        .update(profiles)
        .set({
          ...(fullName !== undefined && { fullName }),
          ...(phone !== undefined && { phone }),
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, teacher.profileId));
    }
    return teacher;
  });
}

export async function deleteTeacher(id: string) {
  await db.delete(teachers).where(eq(teachers.id, id));
}

/** Qué se perdería al borrar al docente: cursos a cargo, encuestas anónimas y observaciones de clase. */
export async function getTeacherRemovalInfo(id: string) {
  const [row] = await db
    .select({
      profileId: teachers.profileId,
      courses: sql<number>`(select cast(count(*) as int) from courses where courses.teacher_id = ${teachers.id})`,
      surveys: sql<number>`(select cast(count(*) as int) from teacher_surveys where teacher_surveys.teacher_id = ${teachers.id})`,
      observations: sql<number>`(select cast(count(*) as int) from class_observations where class_observations.teacher_id = ${teachers.id})`,
    })
    .from(teachers)
    .where(eq(teachers.id, id))
    .limit(1);
  if (!row) return null;
  return { profileId: row.profileId, courses: row.courses, evaluations: row.surveys + row.observations };
}

/** Quita al docente de todos sus cursos (quedan sin docente asignado, no se borran). */
export async function unassignTeacherCourses(id: string): Promise<number> {
  const rows = await db.update(courses).set({ teacherId: null, updatedAt: new Date() }).where(eq(courses.teacherId, id)).returning({ id: courses.id });
  return rows.length;
}
