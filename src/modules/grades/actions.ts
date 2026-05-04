"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { createGradeSchema, updateGradeSchema } from "./schemas";
import { createGrade, updateGrade, deleteGrade } from "./services/grades.service";
import type { ActionResult } from "@/lib/action-result";

export async function createGradeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin", "profesor"]);

  const raw = {
    enrollmentId: formData.get("enrollmentId") as string,
    evaluationType: formData.get("evaluationType") as string,
    score: formData.get("score") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = createGradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createGrade(parsed.data);

  revalidatePath("/admin/grades");
  revalidatePath("/profesor/grades");
  const redirectTo = (formData.get("redirectTo") as string) || "/admin/grades";
  return { success: "Nota cargada correctamente", redirectTo };
}

export async function updateGradeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin", "profesor"]);

  const raw = {
    id: formData.get("id") as string,
    evaluationType: (formData.get("evaluationType") as string) || undefined,
    score: (formData.get("score") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = updateGradeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateGrade(parsed.data);

  revalidatePath("/admin/grades");
  revalidatePath("/profesor/grades");
  return { success: "Nota actualizada", redirectTo: `/admin/grades/${parsed.data.id}` };
}

export async function deleteGradeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin", "profesor"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteGrade(id);

  revalidatePath("/admin/grades");
  revalidatePath("/profesor/grades");
  return { success: "Nota eliminada", redirectTo: "/admin/grades" };
}
