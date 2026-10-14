"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { surveySchema, observationSchema } from "./schemas";
import { submitSurvey, createObservation, hasSurveySubmitted, getActiveEnrollmentForSurvey } from "./services/teacher-evaluations.service";
import { isStudentAccessRestricted } from "@/modules/students/services/students.service";
import type { ActionResult } from "@/lib/action-result";

export async function submitSurveyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["alumno"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  // La inscripción y el docente salen del servidor (SCRUM-280): sin inscripción activa en el
  // curso no se puede evaluar, no se puede votar por otro docente y hay una sola encuesta
  // por alumno y curso.
  if (await isStudentAccessRestricted(user.id)) return { error: "Tu acceso está restringido por cuotas impagas. Regularizá tus pagos con la administración." };

  const courseId = formData.get("courseId") as string;
  const active = courseId ? await getActiveEnrollmentForSurvey(user.id, courseId) : null;
  if (!active) return { error: "No estás inscripto en este curso" };
  if (await hasSurveySubmitted(active.enrollmentId)) {
    return { error: "Ya enviaste tu evaluación para este curso" };
  }

  const raw = {
    teacherId: active.teacherId,
    courseId,
    enrollmentId: active.enrollmentId,
    rating1: formData.get("rating1") as string,
    rating2: formData.get("rating2") as string,
    rating3: formData.get("rating3") as string,
    rating4: formData.get("rating4") as string,
    comment: (formData.get("comment") as string) || undefined,
  };

  const parsed = surveySchema.safeParse(raw);
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

  await submitSurvey(parsed.data);

  revalidatePath("/alumno/evaluations");
  redirect("/alumno/evaluations");
}

export async function createObservationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const user = await getCurrentUser();
  if (!user) return { error: "No autenticado" };

  const raw = {
    teacherId: formData.get("teacherId") as string,
    courseId: formData.get("courseId") as string,
    observedAt: formData.get("observedAt") as string,
    overallRating: formData.get("overallRating") as string,
    observations: formData.get("observations") as string,
    strengths: (formData.get("strengths") as string) || undefined,
    improvements: (formData.get("improvements") as string) || undefined,
  };

  const parsed = observationSchema.safeParse(raw);
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

  await createObservation(parsed.data, user.id);

  revalidatePath("/director/teacher-evaluations");
  redirect("/director/teacher-evaluations");
}
