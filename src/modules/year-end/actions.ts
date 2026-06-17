"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { consolidateYearEnd } from "./services/year-end.service";
import { sendPromotionCongratulationsEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function consolidateYearEndAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const { promoted, graduated, promotedStudents } = await consolidateYearEnd();

  for (const s of promotedStudents) {
    try {
      await sendPromotionCongratulationsEmail({ to: s.email, fullName: s.fullName, courseName: s.courseName });
    } catch (err) {
      console.error(`[year-end] failed sending promotion email to ${s.email}:`, err);
    }
  }

  updateTag("students");
  updateTag("enrollments");
  revalidatePath("/director/year-end");
  const parts: string[] = [];
  if (promoted > 0) parts.push(`${promoted} inscripción(es) marcada(s) como completada(s)`);
  if (graduated > 0) parts.push(`${graduated} alumno(s) marcado(s) como egresado(s)`);
  return { success: parts.length > 0 ? parts.join(", ") : "No había alumnos aptos pendientes" };
}
