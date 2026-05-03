"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { consolidateYearEnd } from "./services/year-end.service";
import type { ActionResult } from "@/lib/action-result";

export async function consolidateYearEndAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const { promoted, graduated } = await consolidateYearEnd();

  revalidatePath("/admin/year-end");
  const parts: string[] = [];
  if (promoted > 0) parts.push(`${promoted} inscripción(es) marcada(s) como completada(s)`);
  if (graduated > 0) parts.push(`${graduated} alumno(s) marcado(s) como egresado(s)`);
  return { success: parts.length > 0 ? parts.join(", ") : "No había alumnos aptos pendientes" };
}
