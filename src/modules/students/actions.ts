"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/helpers";
import { createStudentSchema, updateStudentSchema } from "./schemas";
import { createStudent, updateStudent, deleteStudent } from "./services/students.service";
import { sendInvitationEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function createStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    dni: formData.get("dni") as string,
    birthDate: formData.get("birthDate") as string,
    level: (formData.get("level") as string) || undefined,
    tutorId: (formData.get("tutorId") as string) || undefined,
  };

  const parsed = createStudentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: "alumno" },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Error creando usuario" };
  }

  await adminSupabase.from("profiles").insert({
    id: authData.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone ?? null,
    role: "alumno",
  });

  await createStudent(authData.user.id, parsed.data);

  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
  });
  if (linkData?.properties?.action_link) {
    await sendInvitationEmail({
      to: parsed.data.email,
      fullName: parsed.data.fullName,
      role: "alumno",
      inviteLink: linkData.properties.action_link,
    }).catch(() => {});
  }

  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function updateStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: (formData.get("fullName") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    dni: (formData.get("dni") as string) || undefined,
    birthDate: (formData.get("birthDate") as string) || undefined,
    level: (formData.get("level") as string) || undefined,
    status: (formData.get("status") as string) || undefined,
    tutorId: (formData.get("tutorId") as string) || undefined,
  };

  const parsed = updateStudentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateStudent(parsed.data);

  revalidatePath("/admin/students");
  redirect(`/admin/students/${parsed.data.id}`);
}

export async function deleteStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteStudent(id);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
