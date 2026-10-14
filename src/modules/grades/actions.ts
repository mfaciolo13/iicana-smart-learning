"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { assertEnrollmentAccess, assertGradeAccess } from "@/lib/auth/course-access";
import { createServiceClient } from "@/lib/supabase/service";
import { createGradeSchema, updateGradeSchema } from "./schemas";
import { getGradeAlertInfo } from "./services/grades.service";
import { sendAlert } from "@/lib/notifications/send-alert";
import { sendGradePublishedEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

const EVALUATION_TYPE_LABELS: Record<string, string> = {
  parcial: "Parcial",
  final: "Final",
  oral: "Oral",
  homework: "Tarea",
  quiz: "Quiz",
};

async function notifyGradePublished(gradeId: string): Promise<void> {
  const info = await getGradeAlertInfo(gradeId);
  if (!info) return;

  await sendAlert({
    userId: info.studentProfileId,
    alertType: "grade_published",
    notification: {
      type: "grade",
      title: "Nota publicada",
      body: `Se publicó una nota de ${EVALUATION_TYPE_LABELS[info.evaluationType] ?? info.evaluationType} en ${info.courseName}: ${info.score}/10.`,
    },
    sendEmail: () =>
      sendGradePublishedEmail({
        to: info.studentEmail,
        fullName: info.studentName,
        courseName: info.courseName,
        evaluationTypeLabel: EVALUATION_TYPE_LABELS[info.evaluationType] ?? info.evaluationType,
        score: Number(info.score),
      }),
  });
}

export async function createGradeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "profesor"]);

  const raw = {
    enrollmentId: formData.get("enrollmentId") as string,
    evaluationType: formData.get("evaluationType") as string,
    score: formData.get("score") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = createGradeSchema.safeParse(raw);
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

  await assertEnrollmentAccess(role, parsed.data.enrollmentId);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("grades")
    .insert({
      enrollment_id: parsed.data.enrollmentId,
      evaluation_type: parsed.data.evaluationType,
      score: String(parsed.data.score),
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await notifyGradePublished(data.id);

  revalidatePath("/director/grades");
  revalidatePath("/profesor/grades");
  const redirectTo = (formData.get("redirectTo") as string) || "/director/grades";
  return { success: "Nota cargada correctamente", redirectTo };
}

export async function updateGradeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "profesor"]);

  const raw = {
    id: formData.get("id") as string,
    evaluationType: (formData.get("evaluationType") as string) || undefined,
    score: (formData.get("score") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = updateGradeSchema.safeParse(raw);
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

  await assertGradeAccess(role, parsed.data.id);

  const updateData: Record<string, string | null | undefined> = {};
  if (parsed.data.evaluationType) updateData.evaluation_type = parsed.data.evaluationType;
  if (parsed.data.score !== undefined) updateData.score = String(parsed.data.score);
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;

  const supabase = createServiceClient();
  const { error } = await supabase.from("grades").update(updateData).eq("id", parsed.data.id);

  if (error) return { error: error.message };

  await notifyGradePublished(parsed.data.id);

  revalidatePath("/director/grades");
  revalidatePath("/profesor/grades");
  return { success: "Nota actualizada", redirectTo: `/director/grades/${parsed.data.id}` };
}

export async function deleteGradeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "profesor"]);

  const id = formData.get("id") as string;
  if (!id) return { error: "ID requerido" };
  await assertGradeAccess(role, id);

  const supabase = createServiceClient();
  const { error } = await supabase.from("grades").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/director/grades");
  revalidatePath("/profesor/grades");
  return { success: "Nota eliminada", redirectTo: "/director/grades" };
}
