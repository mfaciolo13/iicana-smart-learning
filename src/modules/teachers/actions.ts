"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/helpers";
import { createTeacherSchema, updateTeacherSchema } from "./schemas";
import { createTeacher, updateTeacher, deleteTeacher } from "./services/teachers.service";
import { sendInvitationEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function createTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    dni: formData.get("dni") as string,
    specialization: (formData.get("specialization") as string) || undefined,
  };

  const parsed = createTeacherSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "profesor" },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Error creando usuario" };
  }

  await adminSupabase.from("profiles").insert({
    id: authData.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone ?? null,
    role: "profesor",
  });

  await createTeacher(authData.user.id, parsed.data);

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const siteUrl = `${proto}://${host}`;

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
    options: { redirectTo: `${siteUrl}/update-password` },
  });

  if (linkError) console.error("[teachers] generateLink error:", linkError.message);

  const inviteLink = linkData?.properties?.action_link;
  if (inviteLink) {
    await sendInvitationEmail({
      to: parsed.data.email,
      fullName: parsed.data.fullName,
      role: "profesor",
      inviteLink,
    }).catch(() => {});
  }

  revalidatePath("/admin/teachers");
  return { success: "Docente registrado correctamente", redirectTo: "/admin/teachers", inviteLink: inviteLink ?? undefined };
}

export async function updateTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: (formData.get("fullName") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    dni: (formData.get("dni") as string) || undefined,
    specialization: (formData.get("specialization") as string) || undefined,
  };

  const parsed = updateTeacherSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateTeacher(parsed.data);

  revalidatePath("/admin/teachers");
  return { success: "Docente actualizado", redirectTo: `/admin/teachers/${parsed.data.id}` };
}

export async function deleteTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteTeacher(id);

  revalidatePath("/admin/teachers");
  return { success: "Docente eliminado", redirectTo: "/admin/teachers" };
}
