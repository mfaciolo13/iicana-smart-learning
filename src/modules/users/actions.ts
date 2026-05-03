"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { updateUserSchema } from "./schemas";
import { updateUser, banUser, unbanUser } from "./services/users.service";
import type { ActionResult } from "@/lib/action-result";

export async function updateUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as string,
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateUser(parsed.data);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${parsed.data.id}`);
}

export async function banUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await banUser(id);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}

export async function unbanUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await unbanUser(id);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}
