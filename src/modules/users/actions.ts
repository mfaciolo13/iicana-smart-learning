"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, getServerUser } from "@/lib/auth/helpers";
import { buildInviteUrl } from "@/lib/site-url";
import { db } from "@/lib/drizzle";
import { profiles } from "@/lib/drizzle/schema";
import { createAdminClient } from "@/lib/supabase/admin";

import { updateUserSchema, createAdministrativoSchema } from "./schemas";
import { updateUser, banUser, unbanUser } from "./services/users.service";
import { sendInvitationEmail } from "@/lib/email";
import { isUniqueViolation } from "@/lib/db-errors";
import type { ActionResult } from "@/lib/action-result";

export async function createAdministrativoAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
  };

  const parsed = createAdministrativoSchema.safeParse(raw);
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

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "administrativo" },
  });

  if (authError || !authData.user) {
    const duplicateEmail = /registered|already|exist/i.test(authError?.message ?? "");
    return { error: duplicateEmail ? "Ya existe un usuario con ese email" : "No se pudo crear el usuario. Intentá de nuevo." };
  }

  try {
    await db.insert(profiles).values({
      id: authData.user.id,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      role: "administrativo",
    });
  } catch (err) {
    // Rollback: borrar el usuario de auth recién creado para no dejar huérfanos.
    await adminSupabase.from("profiles").delete().eq("id", authData.user.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    if (isUniqueViolation(err)) {
      return { error: "Ya existe un usuario con ese email" };
    }
    return { error: "No se pudo crear el usuario. Verificá los datos e intentá de nuevo." };
  }

  const safeInviteUrl = await buildInviteUrl(authData.user.id);

  await sendInvitationEmail({
    to: parsed.data.email,
    fullName: parsed.data.fullName,
    role: "administrativo",
    inviteLink: safeInviteUrl,
  }).catch(() => {});

  revalidatePath("/director/users");
  redirect("/director/users");
}

export async function updateUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as string,
  };

  const parsed = updateUserSchema.safeParse(raw);
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

  // Evita el lockout: un director no puede degradarse a sí mismo, así siempre queda al menos uno activo.
  const currentUser = await getServerUser();
  if (currentUser?.id === parsed.data.id && parsed.data.role !== "director") {
    return { error: "No podés cambiar tu propio rol. Pedile a otro director que lo haga." };
  }

  await updateUser(parsed.data);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/director/users");
  redirect(`/director/users/${parsed.data.id}`);
}

export async function banUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  // Evita el lockout: un director no puede desactivar su propia cuenta.
  const currentUser = await getServerUser();
  if (currentUser?.id === id) {
    return { error: "No podés desactivar tu propia cuenta." };
  }

  await banUser(id);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/director/users");
  redirect(`/director/users/${id}`);
}

export async function resendInvitationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const actorRole = await requireRole(["director", "administrativo"]);

  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;

  if (!email) return { error: "Email requerido" };

  // El link va atado al id del usuario y sólo se genera para cuentas que nunca iniciaron sesión.
  const adminSupabase = createAdminClient();
  const { data: target } = await adminSupabase.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (!target) return { error: "No existe un usuario con ese email" };
  // El administrativo da de alta alumnos, así que sólo puede reenviar invitaciones a alumnos.
  if (actorRole === "administrativo" && target.role !== "alumno") return { error: "No autorizado" };
  const { data: authUser } = await adminSupabase.auth.admin.getUserById(target.id);
  if (authUser?.user?.last_sign_in_at) {
    return { error: "Esa cuenta ya está activa. Si olvidó su contraseña, debe usar \"Olvidé mi contraseña\"." };
  }
  const safeInviteUrl = await buildInviteUrl(target.id);

  await sendInvitationEmail({
    to: email,
    fullName: fullName || email,
    role: target.role,
    inviteLink: safeInviteUrl,
  }).catch(() => {});

  return { success: `Invitación reenviada a ${email}` };
}

export async function unbanUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await unbanUser(id);

  updateTag("teachers");
  updateTag("students");
  revalidatePath("/director/users");
  redirect(`/director/users/${id}`);
}
