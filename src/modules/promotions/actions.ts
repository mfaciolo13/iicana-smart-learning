"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { promoteEnrollment } from "./services/promotions.service";
import type { ActionResult } from "@/lib/action-result";

export async function promoteStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const enrollmentId = formData.get("enrollmentId") as string;
  if (!enrollmentId) return { error: "Datos incompletos" };

  await promoteEnrollment(enrollmentId);

  updateTag("students");
  updateTag("enrollments");
  revalidatePath("/admin/promotions");
  redirect(`/admin/promotions/${enrollmentId}/certificate`);
}
