import { db } from "@/lib/drizzle";
import { students, profiles } from "@/lib/drizzle/schema";
import { eq, ilike, or } from "drizzle-orm";
import type { CreateStudentInput, UpdateStudentInput } from "../schemas";
import type { StudentListItem, StudentWithProfile } from "../types";

export async function getStudents(search?: string): Promise<StudentListItem[]> {
  const rows = await db
    .select({
      id: students.id,
      dni: students.dni,
      level: students.level,
      status: students.status,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(students)
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(
      search
        ? or(
            ilike(profiles.fullName, `%${search}%`),
            ilike(profiles.email, `%${search}%`),
            ilike(students.dni, `%${search}%`)
          )
        : undefined
    )
    .orderBy(profiles.fullName);

  return rows as StudentListItem[];
}

export async function getStudentById(
  id: string
): Promise<StudentWithProfile | null> {
  const rows = await db
    .select({
      id: students.id,
      dni: students.dni,
      birthDate: students.birthDate,
      level: students.level,
      placementTestScore: students.placementTestScore,
      status: students.status,
      profileId: students.profileId,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      profile: {
        fullName: profiles.fullName,
        email: profiles.email,
        phone: profiles.phone,
      },
    })
    .from(students)
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(students.id, id))
    .limit(1);

  return (rows[0] as StudentWithProfile) ?? null;
}

export async function getStudentByProfileId(
  profileId: string
): Promise<StudentWithProfile | null> {
  const rows = await db
    .select({
      id: students.id,
      dni: students.dni,
      birthDate: students.birthDate,
      level: students.level,
      placementTestScore: students.placementTestScore,
      status: students.status,
      profileId: students.profileId,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      profile: {
        fullName: profiles.fullName,
        email: profiles.email,
        phone: profiles.phone,
      },
    })
    .from(students)
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(students.profileId, profileId))
    .limit(1);

  return (rows[0] as StudentWithProfile) ?? null;
}

// Devuelve true si ya existe un alumno con ese DNI (opcionalmente excluyendo
// el propio registro al editar).
export async function dniExists(dni: string, excludeStudentId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.dni, dni))
    .limit(1);
  if (rows.length === 0) return false;
  return rows[0].id !== excludeStudentId;
}

export async function createStudent(
  profileId: string,
  input: CreateStudentInput
) {
  const [student] = await db
    .insert(students)
    .values({
      profileId,
      dni: input.dni,
      birthDate: input.birthDate,
      level: input.level,
      placementTestScore: input.placementTestScore ?? null,
      status: "active",
    })
    .returning();
  return student;
}

export async function updateStudent(input: UpdateStudentInput) {
  const { id, ...data } = input;
  const [updated] = await db
    .update(students)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(students.id, id))
    .returning();
  return updated;
}

export async function deleteStudent(id: string) {
  await db.delete(students).where(eq(students.id, id));
}
