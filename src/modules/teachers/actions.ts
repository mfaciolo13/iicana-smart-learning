"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/helpers";
import { buildInviteUrl } from "@/lib/site-url";
import { createTeacherSchema, updateTeacherSchema } from "./schemas";
import { createTeacher, updateTeacher, deleteTeacher, dniExists } from "./services/teachers.service";
import { sendInvitationEmail } from "@/lib/email";
import { isUniqueViolation } from "@/lib/db-errors";
import type { ActionResult } from "@/lib/action-result";

export async function createTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    dni: formData.get("dni") as string,
    specialization: (formData.get("specialization") as string) || undefined,
  };

  const parsed = createTeacherSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  // Pre-chequeo de DNI duplicado para dar un mensaje claro y evitar crear un
  // usuario de auth que luego quedaría huérfano al fallar el insert.
  if (await dniExists(parsed.data.dni)) {
    return { error: "Ya existe un docente registrado con ese DNI" };
  }

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "profesor" },
  });

  if (authError || !authData.user) {
    const duplicateEmail = /registered|already|exist/i.test(authError?.message ?? "");
    return { error: duplicateEmail ? "Ya existe un usuario con ese email" : "No se pudo crear el usuario. Intentá de nuevo." };
  }

  try {
    const { error: profileError } = await adminSupabase.from("profiles").insert({
      id: authData.user.id,
      email: parsed.data.email,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      role: "profesor",
    });
    if (profileError) throw profileError;

    await createTeacher(authData.user.id, parsed.data);
  } catch (err) {
    // Rollback: borrar el perfil y el usuario de auth recién creados para no
    // dejar registros huérfanos si falló algún insert posterior.
    await adminSupabase.from("profiles").delete().eq("id", authData.user.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    if (isUniqueViolation(err)) {
      return { error: "Ya existe un docente registrado con ese DNI o email" };
    }
    return { error: "No se pudo registrar el docente. Verificá los datos e intentá de nuevo." };
  }

  const safeInviteUrl = await buildInviteUrl(authData.user.id);

  await sendInvitationEmail({
    to: parsed.data.email,
    fullName: parsed.data.fullName,
    role: "profesor",
    inviteLink: safeInviteUrl,
  }).catch(() => {});

  updateTag("teachers");
  revalidatePath("/director/teachers");
  return { success: "Docente registrado correctamente", redirectTo: "/director/teachers" };
}

export async function updateTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: (formData.get("fullName") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    dni: (formData.get("dni") as string) || undefined,
    specialization: (formData.get("specialization") as string) || undefined,
  };

  const parsed = updateTeacherSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  if (parsed.data.dni && (await dniExists(parsed.data.dni, parsed.data.id))) {
    return { error: "Ya existe otro docente registrado con ese DNI" };
  }

  try {
    await updateTeacher(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Ya existe otro docente registrado con ese DNI" };
    }
    return { error: "No se pudo actualizar el docente. Intentá de nuevo." };
  }

  updateTag("teachers");
  revalidatePath("/director/teachers");
  return { success: "Docente actualizado", redirectTo: `/director/teachers/${parsed.data.id}` };
}

export async function deleteTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteTeacher(id);

  updateTag("teachers");
  revalidatePath("/director/teachers");
  return { success: "Docente eliminado", redirectTo: "/director/teachers" };
}
