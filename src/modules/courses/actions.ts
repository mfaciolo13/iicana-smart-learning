"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { teachers, profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendTeacherAssignmentEmail } from "@/lib/email";
import { createCourseSchema, updateCourseSchema } from "./schemas";
import { createCourse, updateCourse, deleteCourse, getCourseById } from "./services/courses.service";
import type { ActionResult } from "@/lib/action-result";

export async function createCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const raw = {
    name: formData.get("name") as string,
    level: formData.get("level") as string,
    classDays: ((formData.get("classDays") as string) || "").split(",").filter(Boolean),
    classTime: formData.get("classTime") as string,
    classDurationMinutes: formData.get("classDurationMinutes") as string,
    classroom: (formData.get("classroom") as string) || undefined,
    maxCapacity: formData.get("maxCapacity") as string,
    teacherId: (formData.get("teacherId") as string) || undefined,
    diagnosticFrequency: formData.get("diagnosticFrequency") as string,
  };

  const parsed = createCourseSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  await createCourse(parsed.data);

  updateTag("courses");
  revalidatePath("/director/courses");
  return { success: "Curso creado correctamente", redirectTo: "/director/courses" };
}

export async function updateCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const classDays = ((formData.get("classDays") as string) || "").split(",").filter(Boolean);

  const raw = {
    id: formData.get("id") as string,
    name: (formData.get("name") as string) || undefined,
    level: (formData.get("level") as string) || undefined,
    classDays: classDays.length > 0 ? classDays : undefined,
    classTime: (formData.get("classTime") as string) || undefined,
    classDurationMinutes: (formData.get("classDurationMinutes") as string) || undefined,
    classroom: (formData.get("classroom") as string) || undefined,
    maxCapacity: (formData.get("maxCapacity") as string) || undefined,
    teacherId: (formData.get("teacherId") as string) || undefined,
    status: (formData.get("status") as string) || undefined,
    diagnosticFrequency: (formData.get("diagnosticFrequency") as string) || undefined,
  };

  const parsed = updateCourseSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat)
          .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
          .filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  const [prevCourse, updatedCourse] = await Promise.all([
    getCourseById(parsed.data.id),
    updateCourse(parsed.data),
  ]);

  // Email teacher only when they are newly assigned (not already in that role)
  if (parsed.data.teacherId && parsed.data.teacherId !== prevCourse?.teacherId) {
    try {
      const [teacherInfo] = await db
        .select({ email: profiles.email, fullName: profiles.fullName })
        .from(teachers)
        .innerJoin(profiles, eq(teachers.profileId, profiles.id))
        .where(eq(teachers.id, parsed.data.teacherId))
        .limit(1);
      if (teacherInfo) {
        await sendTeacherAssignmentEmail({
          to: teacherInfo.email,
          fullName: teacherInfo.fullName,
          courseName: updatedCourse.name,
          courseSchedule: updatedCourse.schedule,
        });
      }
    } catch (e) {
      console.error("[teacher assignment email]", e);
    }
  }

  updateTag("courses");
  revalidatePath("/director/courses");
  return { success: "Curso actualizado", redirectTo: `/director/courses/${parsed.data.id}` };
}

export async function deleteCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteCourse(id);

  updateTag("courses");
  revalidatePath("/director/courses");
  return { success: "Curso eliminado", redirectTo: "/director/courses" };
}
