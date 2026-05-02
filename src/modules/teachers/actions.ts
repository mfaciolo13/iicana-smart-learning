"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/helpers";
import { createTeacherSchema, updateTeacherSchema } from "./schemas";
import { createTeacher, updateTeacher, deleteTeacher } from "./services/teachers.service";

export async function createTeacherAction(formData: FormData) {
  await requireRole(["admin"]);

  const raw = {
    email: formData.get("email") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    dni: formData.get("dni") as string,
    specialization: (formData.get("specialization") as string) || undefined,
  };

  const parsed = createTeacherSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const adminSupabase = createAdminClient();

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: "profesor",
    },
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

  revalidatePath("/admin/teachers");
  redirect("/admin/teachers");
}

export async function updateTeacherAction(formData: FormData) {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: (formData.get("fullName") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    dni: (formData.get("dni") as string) || undefined,
    specialization: (formData.get("specialization") as string) || undefined,
  };

  const parsed = updateTeacherSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await updateTeacher(parsed.data);

  revalidatePath("/admin/teachers");
  redirect(`/admin/teachers/${parsed.data.id}`);
}

export async function deleteTeacherAction(formData: FormData) {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteTeacher(id);

  revalidatePath("/admin/teachers");
  redirect("/admin/teachers");
}
