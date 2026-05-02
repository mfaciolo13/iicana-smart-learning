"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { updateUserSchema } from "./schemas";
import { updateUser, banUser, unbanUser } from "./services/users.service";

export async function updateUserAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    fullName: formData.get("fullName") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as string,
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) return;

  await updateUser(parsed.data);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${parsed.data.id}`);
}

export async function banUserAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return;

  await banUser(id);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}

export async function unbanUserAction(formData: FormData): Promise<void> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return;

  await unbanUser(id);

  revalidatePath("/admin/users");
  redirect(`/admin/users/${id}`);
}
