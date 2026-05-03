"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { createCourseSchema, updateCourseSchema } from "./schemas";
import { createCourse, updateCourse, deleteCourse } from "./services/courses.service";
import type { ActionResult } from "@/lib/action-result";

export async function createCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    name: formData.get("name") as string,
    level: formData.get("level") as string,
    schedule: formData.get("schedule") as string,
    classroom: (formData.get("classroom") as string) || undefined,
    maxCapacity: formData.get("maxCapacity") as string,
    teacherId: (formData.get("teacherId") as string) || undefined,
  };

  const parsed = createCourseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createCourse(parsed.data);

  revalidatePath("/admin/courses");
  return { success: "Curso creado correctamente", redirectTo: "/admin/courses" };
}

export async function updateCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    name: (formData.get("name") as string) || undefined,
    level: (formData.get("level") as string) || undefined,
    schedule: (formData.get("schedule") as string) || undefined,
    classroom: (formData.get("classroom") as string) || undefined,
    maxCapacity: (formData.get("maxCapacity") as string) || undefined,
    teacherId: (formData.get("teacherId") as string) || undefined,
    status: (formData.get("status") as string) || undefined,
  };

  const parsed = updateCourseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updateCourse(parsed.data);

  revalidatePath("/admin/courses");
  return { success: "Curso actualizado", redirectTo: `/admin/courses/${parsed.data.id}` };
}

export async function deleteCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteCourse(id);

  revalidatePath("/admin/courses");
  return { success: "Curso eliminado", redirectTo: "/admin/courses" };
}
