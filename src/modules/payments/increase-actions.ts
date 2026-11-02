"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentActor } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";
import { IncreaseError, cancelIncrease, createIncrease, updateIncrease } from "./services/fee-increases.service";

const increaseSchema = z.object({
  percentage: z.coerce.number({ error: "El porcentaje debe ser un número" }),
  quarter: z.string().min(1, "Elegí el trimestre"),
  effectiveDate: z.string().min(1, "Elegí la fecha de entrada en vigencia"),
  notes: z.string().trim().max(300, "Las notas no pueden superar los 300 caracteres").optional(),
});

const field = (formData: FormData, key: string) => ((formData.get(key) as string | null) ?? "") || undefined;

function parse(formData: FormData) {
  // Un campo vacío no es "0": exige que el porcentaje se ingrese explícitamente.
  const rawPercentage = (field(formData, "percentage") ?? "").replace(",", ".");
  if (rawPercentage === "") return { error: "Ingresá el porcentaje de aumento" } as const;
  const parsed = increaseSchema.safeParse({
    percentage: rawPercentage,
    quarter: field(formData, "quarter"),
    effectiveDate: field(formData, "effectiveDate"),
    notes: field(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  return { data: parsed.data } as const;
}

function revalidate() {
  revalidatePath("/director/settings/fee-increases");
  for (const base of ["/director", "/administrativo", "/alumno"]) revalidatePath(`${base}/payments`);
}

/** Programa un aumento trimestral. Sólo Dirección; los permisos se validan acá, no solo en la interfaz. */
export async function createIncreaseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await createIncrease(parsed.data, actor);
  } catch (e) {
    if (e instanceof IncreaseError) return { error: e.message };
    throw e;
  }
  revalidate();
  return { success: "Aumento programado. Se aplicará solo cuando llegue su fecha de vigencia." };
}

/** Corrige un aumento programado mientras no haya entrado en vigencia. */
export async function updateIncreaseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };
  const id = z.uuid("Aumento inválido").safeParse(formData.get("id"));
  if (!id.success) return { error: id.error.issues[0].message };
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await updateIncrease(id.data, parsed.data, actor);
  } catch (e) {
    if (e instanceof IncreaseError) return { error: e.message };
    throw e;
  }
  revalidate();
  return { success: "Aumento actualizado" };
}

export async function cancelIncreaseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };
  const id = z.uuid("Aumento inválido").safeParse(formData.get("id"));
  if (!id.success) return { error: id.error.issues[0].message };

  try {
    await cancelIncrease(id.data, actor);
  } catch (e) {
    if (e instanceof IncreaseError) return { error: e.message };
    throw e;
  }
  revalidate();
  return { success: "Aumento cancelado" };
}
