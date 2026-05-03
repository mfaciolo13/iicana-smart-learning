"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { createEnrollmentSchema, updateEnrollmentSchema } from "./schemas";
import {
  validateAndCreateEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from "./services/enrollments.service";
import type { ActionResult } from "@/lib/action-result";

export async function createEnrollmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    studentId: formData.get("studentId") as string,
    courseId: formData.get("courseId") as string,
  };

  const parsed = createEnrollmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await validateAndCreateEnrollment(parsed.data);
  if (result.error) return { error: result.error };

  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/students");
  revalidatePath("/admin/courses");
  return { success: "Inscripción creada correctamente", redirectTo: "/admin/enrollments" };
}

export async function updateEnrollmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateEnrollmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateEnrollment(parsed.data);

  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/students");
  revalidatePath("/admin/courses");
  return { success: "Inscripción actualizada" };
}

export async function deleteEnrollmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteEnrollment(id);

  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/students");
  revalidatePath("/admin/courses");
  return { success: "Inscripción eliminada", redirectTo: "/admin/enrollments" };
}
