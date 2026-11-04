"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { consolidateYearEnd } from "./services/year-end.service";
import { sendPromotionCongratulationsEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/action-result";

export async function consolidateYearEndAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const { promoted, graduated, promotedStudents } = await consolidateYearEnd();

  // Las promociones ya están escritas: si un correo falla no se puede "reintentar el cierre" (ya no quedan aptos
  // pendientes), así que se informa quiénes no recibieron el aviso para que se les escriba desde Comunicaciones.
  const failed: string[] = [];
  for (const s of promotedStudents) {
    try {
      await sendPromotionCongratulationsEmail({ to: s.email, fullName: s.fullName, courseName: s.courseName });
    } catch (err) {
      failed.push(s.fullName);
      console.error(`[year-end] failed sending promotion email to ${s.email}:`, err);
    }
  }

  updateTag("students");
  updateTag("enrollments");
  revalidatePath("/director/year-end");
  const parts: string[] = [];
  if (promoted > 0) parts.push(`${promoted} inscripción(es) marcada(s) como completada(s)`);
  if (graduated > 0) parts.push(`${graduated} alumno(s) marcado(s) como egresado(s)`);
  if (parts.length === 0) return { success: "No había alumnos aptos pendientes" };
  if (failed.length > 0) {
    const sample = failed.slice(0, 5).join(", ");
    return { success: `${parts.join(", ")}. Atención: no se pudo enviar el email de felicitación a ${failed.length} alumno${failed.length === 1 ? "" : "s"} (${sample}${failed.length > 5 ? "…" : ""}); avisales desde Comunicaciones.` };
  }
  return { success: parts.join(", ") };
}
