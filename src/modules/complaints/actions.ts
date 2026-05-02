"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { createComplaintSchema, updateComplaintStatusSchema } from "./schemas";
import { createComplaint, updateComplaintStatus } from "./services/complaints.service";

export async function createComplaintAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const complaint = await createComplaint(user.id, parsed.data);

  revalidatePath("/alumno/complaints");
  revalidatePath("/tutor/complaints");
  revalidatePath("/profesor/complaints");
  revalidatePath("/admin/complaints");
  redirect(`/alumno/complaints`);
}

export async function createComplaintAsTutorAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await createComplaint(user.id, parsed.data);

  revalidatePath("/tutor/complaints");
  revalidatePath("/admin/complaints");
  redirect("/tutor/complaints");
}

export async function createComplaintAsProfesorAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await createComplaint(user.id, parsed.data);

  revalidatePath("/profesor/complaints");
  revalidatePath("/admin/complaints");
  redirect("/profesor/complaints");
}

export async function updateComplaintStatusAction(formData: FormData) {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateComplaintStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await updateComplaintStatus(parsed.data.id, parsed.data.status);

  revalidatePath("/admin/complaints");
  redirect(`/admin/complaints/${parsed.data.id}`);
}
