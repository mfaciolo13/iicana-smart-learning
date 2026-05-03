"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { surveySchema, observationSchema } from "./schemas";
import { submitSurvey, createObservation, hasSurveySubmitted } from "./services/teacher-evaluations.service";
import type { ActionResult } from "@/lib/action-result";

export async function submitSurveyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["alumno"]);

  const enrollmentId = formData.get("enrollmentId") as string;
  if (enrollmentId && (await hasSurveySubmitted(enrollmentId))) {
    return { error: "Ya enviaste tu evaluación para este curso" };
  }

  const raw = {
    teacherId: formData.get("teacherId") as string,
    courseId: formData.get("courseId") as string,
    enrollmentId: enrollmentId || undefined,
    rating1: formData.get("rating1") as string,
    rating2: formData.get("rating2") as string,
    rating3: formData.get("rating3") as string,
    rating4: formData.get("rating4") as string,
    comment: (formData.get("comment") as string) || undefined,
  };

  const parsed = surveySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await submitSurvey(parsed.data);

  revalidatePath("/alumno/evaluations");
  redirect("/alumno/evaluations");
}

export async function createObservationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createObservation(parsed.data, user.id);

  revalidatePath("/admin/teacher-evaluations");
  redirect("/admin/teacher-evaluations");
}
