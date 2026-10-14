"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getCurrentUser } from "@/lib/auth/helpers";
import { createComplaintSchema, updateComplaintStatusSchema } from "./schemas";
import { createComplaint, updateComplaintStatus } from "./services/complaints.service";
import type { ActionResult } from "@/lib/action-result";

export async function createComplaintAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["alumno", "profesor", "administrativo", "director"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
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

  await createComplaint(user.id, parsed.data);

  revalidatePath("/alumno/complaints");
  revalidatePath("/director/complaints");
  revalidatePath("/administrativo/complaints");
  revalidatePath("/director");
  revalidatePath("/administrativo");
  return { success: "Reclamo enviado correctamente", redirectTo: "/alumno/complaints" };
}

export async function createComplaintAsProfesorAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["profesor"]);
  const user = await getCurrentUser();
  if (!user) return { error: "No autorizado" };

  const raw = {
    type: formData.get("type") as string,
    description: formData.get("description") as string,
  };

  const parsed = createComplaintSchema.safeParse(raw);
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

  await createComplaint(user.id, parsed.data);

  revalidatePath("/profesor/complaints");
  revalidatePath("/director/complaints");
  revalidatePath("/administrativo/complaints");
  revalidatePath("/director");
  revalidatePath("/administrativo");
  return { success: "Reclamo enviado correctamente", redirectTo: "/profesor/complaints" };
}

export async function updateComplaintStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updateComplaintStatusSchema.safeParse(raw);
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

  await updateComplaintStatus(parsed.data.id, parsed.data.status);

  revalidatePath("/director/complaints");
  revalidatePath("/administrativo/complaints");
  revalidatePath(`/director/complaints/${parsed.data.id}`);
  revalidatePath(`/administrativo/complaints/${parsed.data.id}`);
  // El contador de reclamos abiertos de los dashboards depende del estado.
  revalidatePath("/director");
  revalidatePath("/administrativo");
  return { success: "Estado actualizado" };
}
