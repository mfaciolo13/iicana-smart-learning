"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/helpers";
import { buildInviteUrl } from "@/lib/site-url";
import { portalPath } from "@/lib/portal";
import { createStudentSchema, updateStudentSchema } from "./schemas";
import { createStudent, updateStudent, deleteStudent, setStudentAccessRestricted, dniExists, getStudentRemovalInfo } from "./services/students.service";
import { removalMode } from "./lib/removal";
import { sendInvitationEmail } from "@/lib/email";
import { isUniqueViolation } from "@/lib/db-errors";
import type { ActionResult } from "@/lib/action-result";

export async function createStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    dni: formData.get("dni") as string,
    birthDate: formData.get("birthDate") as string,
    level: (formData.get("level") as string) || undefined,
    placementTestScore: (formData.get("placementTestScore") as string) || undefined,
  };

  const parsed = createStudentSchema.safeParse(raw);
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
    return { error: "Ya existe un alumno registrado con ese DNI" };
  }

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "alumno" },
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
      role: "alumno",
    });
    if (profileError) throw profileError;

    await createStudent(authData.user.id, parsed.data);
  } catch (err) {
    // Rollback: borrar el perfil y el usuario de auth recién creados para no
    // dejar registros huérfanos si falló algún insert posterior.
    await adminSupabase.from("profiles").delete().eq("id", authData.user.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    if (isUniqueViolation(err)) {
      return { error: "Ya existe un alumno registrado con ese DNI o email" };
    }
    return { error: "No se pudo registrar el alumno. Verificá los datos e intentá de nuevo." };
  }

  const safeInviteUrl = await buildInviteUrl(authData.user.id);

  await sendInvitationEmail({
    to: parsed.data.email,
    fullName: parsed.data.fullName,
    role: "alumno",
    inviteLink: safeInviteUrl,
  }).catch(() => {});

  updateTag("students");
  revalidatePath("/director/students");
  revalidatePath("/administrativo/students");
  return { success: "Alumno registrado correctamente", redirectTo: portalPath(role, "/students") };
}

export async function updateStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: (formData.get("fullName") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    dni: (formData.get("dni") as string) || undefined,
    birthDate: (formData.get("birthDate") as string) || undefined,
    level: (formData.get("level") as string) || undefined,
    placementTestScore: (formData.get("placementTestScore") as string) || undefined,
    status: (formData.get("status") as string) || undefined,
  };

  const parsed = updateStudentSchema.safeParse(raw);
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
    return { error: "Ya existe otro alumno registrado con ese DNI" };
  }

  try {
    await updateStudent(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Ya existe otro alumno registrado con ese DNI" };
    }
    return { error: "No se pudo actualizar el alumno. Intentá de nuevo." };
  }

  updateTag("students");
  revalidatePath("/director/students");
  revalidatePath("/administrativo/students");
  return { success: "Alumno actualizado", redirectTo: portalPath(role, `/students/${parsed.data.id}`) };
}

export async function toggleAccessRestrictedAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const id = formData.get("id") as string;
  const restrict = formData.get("restrict") === "true";
  if (!id) return { error: "ID requerido" };

  await setStudentAccessRestricted(id, restrict);

  updateTag("students");
  revalidatePath(`/director/students/${id}`);
  revalidatePath(`/administrativo/students/${id}`);
  return { success: restrict ? "Acceso restringido" : "Restricción levantada" };
}

export async function deleteStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  const info = await getStudentRemovalInfo(id);
  if (!info) return { error: "El alumno no existe" };

  const adminSupabase = createAdminClient();
  const mode = removalMode(info.impact, role);

  if (mode === "deactivate") {
    // Baja lógica (SCRUM-281): inactivo y sin acceso; los pagos y las inscripciones se conservan.
    await updateStudent({ id, status: "inactive" });
    const { error } = await adminSupabase.auth.admin.updateUserById(info.profileId, { ban_duration: "87600h" });
    if (error) return { error: "El alumno quedó inactivo, pero no se pudo bloquear su acceso. Intentá de nuevo." };
  } else {
    // Sin historia: borrado físico (sólo director). También se quitan el perfil y la cuenta de acceso.
    await deleteStudent(id);
    await adminSupabase.from("profiles").delete().eq("id", info.profileId);
    await adminSupabase.auth.admin.deleteUser(info.profileId).catch(() => {});
  }

  updateTag("students");
  revalidatePath("/director/students");
  revalidatePath("/administrativo/students");
  return {
    success: mode === "deactivate" ? "Alumno dado de baja (se conservan sus pagos e inscripciones)" : "Alumno eliminado",
    redirectTo: portalPath(role, "/students"),
  };
}
