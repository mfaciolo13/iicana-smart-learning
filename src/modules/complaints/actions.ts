"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { createComplaintSchema, updateComplaintStatusSchema } from "./schemas";
import { createComplaint, updateComplaintStatus } from "./services/complaints.service";
import type { ActionResult } from "@/lib/action-result";

export async function createComplaintAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createComplaint(user.id, parsed.data);

  revalidatePath("/alumno/complaints");
  revalidatePath("/admin/complaints");
  return { success: "Reclamo enviado correctamente", redirectTo: "/alumno/complaints" };
}

export async function createComplaintAsTutorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createComplaint(user.id, parsed.data);

  revalidatePath("/tutor/complaints");
  revalidatePath("/admin/complaints");
  return { success: "Reclamo enviado correctamente", redirectTo: "/tutor/complaints" };
}

export async function createComplaintAsProfesorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createComplaint(user.id, parsed.data);

  revalidatePath("/profesor/complaints");
  revalidatePath("/admin/complaints");
  return { success: "Reclamo enviado correctamente", redirectTo: "/profesor/complaints" };
}

export async function updateComplaintStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateComplaintStatusSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateComplaintStatus(parsed.data.id, parsed.data.status);

  revalidatePath("/admin/complaints");
  return { success: "Estado actualizado" };
}
