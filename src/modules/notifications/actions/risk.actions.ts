"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { getServerUser } from "@/lib/auth/helpers";
import { db } from "@/lib/drizzle";
import { studentRiskAssessments } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";

export async function markIntervenedAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const user = await getServerUser();
  if (!user) return { error: "No autorizado" };

  const riskAssessmentId = formData.get("riskAssessmentId") as string;
  const note = (formData.get("note") as string) || null;

  if (!riskAssessmentId) return { error: "ID requerido" };

  await db
    .update(studentRiskAssessments)
    .set({ intervenedAt: new Date(), intervenedBy: user.id, interventionNote: note })
    .where(eq(studentRiskAssessments.id, riskAssessmentId));

  revalidatePath("/director/risk");
  return { success: "Intervención registrada" };
}
