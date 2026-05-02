import { db } from "@/lib/drizzle";
import { teachers, profiles } from "@/lib/drizzle/schema";
import { eq, ilike, or } from "drizzle-orm";
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

export async function updateTeacher(input: UpdateTeacherInput) {
  const { id, ...data } = input;
  const [updated] = await db
    .update(teachers)
    .set(data)
    .where(eq(teachers.id, id))
    .returning();
  return updated;
}

export async function deleteTeacher(id: string) {
  await db.delete(teachers).where(eq(teachers.id, id));
}
