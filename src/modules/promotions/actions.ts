"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { promoteEnrollment } from "./services/promotions.service";
import type { ActionResult } from "@/lib/action-result";

export async function promoteStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  const enrollmentId = formData.get("enrollmentId") as string;
  if (!enrollmentId) return { error: "Datos incompletos" };

  const result = await promoteEnrollment(enrollmentId);
  if ("error" in result) return { error: result.error };

  updateTag("students");
  updateTag("enrollments");
  revalidatePath("/director/promotions");
  redirect(`/director/promotions/${enrollmentId}/certificate`);
}
