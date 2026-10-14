"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { portalPath } from "@/lib/portal";
import { db } from "@/lib/drizzle";
import { students, profiles, courses } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEnrollmentEmail } from "@/lib/email";
import { createEnrollmentSchema, updateEnrollmentSchema } from "./schemas";
import {
  validateAndCreateEnrollment,
  updateEnrollment,
  deleteEnrollment,
} from "./services/enrollments.service";
import type { ActionResult } from "@/lib/action-result";

export async function createEnrollmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);

  const raw = {
    studentId: formData.get("studentId") as string,
    courseId: formData.get("courseId") as string,
  };

  const parsed = createEnrollmentSchema.safeParse(raw);
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

  const result = await validateAndCreateEnrollment(parsed.data);
  if ("error" in result) return { error: result.error };

  // Send enrollment confirmation email (non-blocking on failure)
  try {
    const [[studentInfo], [courseInfo]] = await Promise.all([
      db
        .select({ email: profiles.email, fullName: profiles.fullName })
        .from(students)
        .innerJoin(profiles, eq(students.profileId, profiles.id))
        .where(eq(students.id, parsed.data.studentId))
        .limit(1),
      db
        .select({ name: courses.name, schedule: courses.schedule })
        .from(courses)
        .where(eq(courses.id, parsed.data.courseId))
        .limit(1),
    ]);
    if (studentInfo && courseInfo) {
      await sendEnrollmentEmail({
        to: studentInfo.email,
        fullName: studentInfo.fullName,
        courseName: courseInfo.name,
        courseSchedule: courseInfo.schedule,
      });
    }
  } catch (e) {
    console.error("[enrollment email]", e);
  }

  updateTag("enrollments");
  updateTag("students");
  revalidatePath("/director/enrollments");
  revalidatePath("/director/students");
  revalidatePath("/director/courses");
  revalidatePath("/administrativo/enrollments");
  revalidatePath("/administrativo/students");
  return { success: "Inscripción creada correctamente", redirectTo: portalPath(role, "/enrollments") };
}

export async function updateEnrollmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateEnrollmentSchema.safeParse(raw);
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

  const result = await updateEnrollment(parsed.data);
  if ("error" in result) return { error: result.error };

  updateTag("enrollments");
  updateTag("students");
  revalidatePath("/director/enrollments");
  revalidatePath("/director/students");
  revalidatePath("/director/courses");
  revalidatePath("/administrativo/enrollments");
  revalidatePath("/administrativo/students");
  return { success: "Inscripción actualizada" };
}

export async function deleteEnrollmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteEnrollment(id);

  updateTag("enrollments");
  updateTag("students");
  revalidatePath("/director/enrollments");
  revalidatePath("/director/students");
  revalidatePath("/director/courses");
  revalidatePath("/administrativo/enrollments");
  revalidatePath("/administrativo/students");
  return { success: "Inscripción eliminada", redirectTo: portalPath(role, "/enrollments") };
}
