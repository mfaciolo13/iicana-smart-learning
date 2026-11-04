import { db } from "@/lib/drizzle";
import { profiles, students, teachers } from "@/lib/drizzle/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserListItem, UserDetail, UserRole } from "../types";
import type { UpdateUserInput } from "../schemas";

export async function getUsers(search?: string): Promise<UserListItem[]> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(
      search
        ? or(
            ilike(profiles.fullName, `%${search}%`),
            ilike(profiles.email, `%${search}%`)
          )
        : undefined
    )
    .orderBy(profiles.fullName);

  return rows as UserListItem[];
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);

  if (!rows[0]) return null;

  // Check ban and email confirmation status from Supabase auth
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(id);
    const banned =
      !!data?.user?.banned_until &&
      new Date(data.user.banned_until) > new Date();
    // Las tres rutas de alta crean el usuario con email_confirm: true, así que email_confirmed_at es siempre
    // verdadero. Una cuenta está "activa" cuando la persona ya inició sesión alguna vez.
    const emailConfirmed = !!data?.user?.last_sign_in_at;
    return { ...rows[0], role: rows[0].role as UserRole, banned, emailConfirmed };
  } catch {
    return { ...rows[0], role: rows[0].role as UserRole, banned: false, emailConfirmed: false };
  }
}

/**
 * Un cambio de rol no puede dejar a la persona sin legajo ni sin portal: alumnos y docentes tienen
 * una ficha propia (inscripciones, pagos, notas, evaluaciones) que este formulario no crea ni da de
 * baja. Devuelve el motivo si el cambio no es válido, o null si se puede hacer.
 */
export async function checkRoleChange(userId: string, newRole: UserRole): Promise<string | null> {
  const [current] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!current) return "El usuario no existe";
  if (current.role === newRole) return null;

  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.profileId, userId)).limit(1);
  const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.profileId, userId)).limit(1);

  if (student && newRole !== "alumno") {
    return "Esta persona tiene legajo de alumno (inscripciones, pagos y notas). Para quitarle el acceso dala de baja desde Alumnos: cambiarle el rol la dejaría sin portal.";
  }
  if (teacher && newRole !== "profesor") {
    return "Esta persona tiene ficha de docente (cursos y evaluaciones). Para quitarle el acceso dala de baja desde Docentes: cambiarle el rol la dejaría sin portal.";
  }
  if (newRole === "alumno" && !student) {
    return "Para que sea alumno hay que darlo de alta desde Alumnos (necesita DNI y fecha de nacimiento).";
  }
  if (newRole === "profesor" && !teacher) {
    return "Para que sea docente hay que darlo de alta desde Docentes (necesita DNI).";
  }
  return null;
}

export async function updateUser(input: UpdateUserInput) {
  const [updated] = await db
    .update(profiles)
    .set({
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, input.id))
    .returning();
  return updated;
}

export async function banUser(id: string) {
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, {
    ban_duration: "87600h", // 10 years
  });
  await revokeSessions(id);
}

/**
 * El baneo bloquea el login y la renovación, pero una sesión ya abierta seguiría vigente hasta que
 * venza su token. Borrar las sesiones del usuario las invalida de inmediato.
 */
export async function revokeSessions(userId: string) {
  try {
    await db.execute(sql`delete from auth.sessions where user_id = ${userId}`);
  } catch (e) {
    console.error("[usuarios] no se pudieron cerrar las sesiones abiertas:", e instanceof Error ? e.message : e);
  }
}

export async function unbanUser(id: string) {
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, {
    ban_duration: "none",
  });
}
