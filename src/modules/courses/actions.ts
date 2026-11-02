"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { teachers, profiles } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { sendTeacherAssignmentEmail } from "@/lib/email";
import { createCourseSchema, updateCourseSchema } from "./schemas";
import { createCourse, updateCourseChecked, deleteCourse, getCourseById } from "./services/courses.service";
import { findScheduleConflictsForCourse } from "@/modules/enrollments/services/enrollments.service";
import { formatSchedule } from "./lib/schedule";
import type { ActionResult } from "@/lib/action-result";
import { refreshAnalytics } from "@/lib/analytics-cache";

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
  refreshAnalytics();
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
    // Si el campo viene vacío se limpia el aula (antes "" se descartaba y no se podía quitar).
    classroom: formData.has("classroom") ? (formData.get("classroom") as string) : undefined,
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

  const prevCourse = await getCourseById(parsed.data.id);
  if (!prevCourse) return { error: "El curso no existe" };

  // Cambiar días, hora o duración vuelve a aplicar la regla de superposición de horarios de los alumnos
  // ya inscriptos (la inscripción la hace cumplir, pero la edición del curso la salteaba).
  if (parsed.data.classDays || parsed.data.classTime || parsed.data.classDurationMinutes !== undefined) {
    const newSchedule = formatSchedule(
      parsed.data.classDays ?? prevCourse.classDays,
      parsed.data.classTime ?? prevCourse.classTime.slice(0, 5),
      parsed.data.classDurationMinutes ?? prevCourse.classDurationMinutes,
    );
    if (newSchedule && newSchedule !== prevCourse.schedule) {
      const conflicts = await findScheduleConflictsForCourse(parsed.data.id, newSchedule);
      if (conflicts.length > 0) {
        const sample = conflicts.slice(0, 3).map((c) => `${c.studentName} (también cursa "${c.otherCourse}")`).join(", ");
        return { error: `El nuevo horario se superpone con otro curso de ${conflicts.length} alumno${conflicts.length === 1 ? "" : "s"} inscripto${conflicts.length === 1 ? "" : "s"}: ${sample}${conflicts.length > 3 ? "…" : ""}` };
      }
    }
  }

  // El cupo se verifica dentro de la misma transacción (SCRUM-324): no puede quedar por debajo de los inscriptos.
  const result = await updateCourseChecked(parsed.data);
  if (!result.ok) {
    return { error: result.error, ...(result.field && { fieldErrors: { [result.field]: result.error } }) };
  }
  const updatedCourse = result.course;

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
  refreshAnalytics();
  revalidatePath("/director/courses");
  return { success: "Curso actualizado", redirectTo: `/director/courses/${parsed.data.id}` };
}

export async function deleteCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };

  await deleteCourse(id);

  updateTag("courses");
  refreshAnalytics();
  revalidatePath("/director/courses");
  return { success: "Curso eliminado", redirectTo: "/director/courses" };
}
