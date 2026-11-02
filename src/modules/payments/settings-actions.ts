"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentActor } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";
import { pricingRatesSchema, savePricingRates, saveInvoicingSettings } from "./services/settings.service";
import { saveFeePlan } from "./services/fee-plans.service";

/** Política de facturación de los cobros en efectivo. Sólo Dirección. */
export async function saveInvoicingSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };
  await saveInvoicingSettings({ autoInvoiceCash: formData.get("autoInvoiceCash") === "on" }, actor);
  revalidatePath("/director/settings/payments");
  return { success: "Política de facturación actualizada" };
}

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** Política económica (descuentos, recargo de tarjeta, último día de descuento). Sólo Dirección. */
export async function savePricingRatesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = pricingRatesSchema.safeParse({
    transferDiscountPct: formData.get("transferDiscountPct"),
    cashDiscountPct: formData.get("cashDiscountPct"),
    cardSurchargePct: formData.get("cardSurchargePct"),
    discountLastDay: formData.get("discountLastDay"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await savePricingRates(parsed.data, actor);
  revalidatePath("/director/settings/payments");
  for (const base of ["/director", "/administrativo", "/alumno"]) revalidatePath(`${base}/payments`);
  return { success: "Política de precios actualizada" };
}

const planSchema = z
  .object({
    studentId: z.uuid("Alumno inválido"),
    courseId: z.preprocess(blankToUndefined, z.uuid("Curso inválido").optional()),
    listPrice: z.coerce.number().positive("El precio de lista debe ser mayor a 0").max(99999999.99, "El precio de lista es demasiado alto"),
    transferPrice: z.preprocess(blankToUndefined, z.coerce.number().positive("El precio por transferencia debe ser mayor a 0").optional()),
    cashPrice: z.preprocess(blankToUndefined, z.coerce.number().positive("El precio en efectivo debe ser mayor a 0").optional()),
  })
  .superRefine((v, ctx) => {
    if (v.transferPrice !== undefined && v.transferPrice > v.listPrice)
      ctx.addIssue({ code: "custom", path: ["transferPrice"], message: "El precio por transferencia no puede superar el de lista" });
    if (v.cashPrice !== undefined && v.cashPrice > v.listPrice)
      ctx.addIssue({ code: "custom", path: ["cashPrice"], message: "El precio en efectivo no puede superar el de lista" });
  });

/** Precios acordados con un alumno (plantilla para sus cuotas nuevas). Sólo Dirección. */
export async function saveFeePlanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = planSchema.safeParse({
    studentId: formData.get("studentId"),
    courseId: formData.get("courseId"),
    listPrice: formData.get("listPrice"),
    transferPrice: formData.get("transferPrice"),
    cashPrice: formData.get("cashPrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await saveFeePlan(parsed.data, actor);
  revalidatePath("/director/settings/payments");
  revalidatePath("/administrativo/payments/plans");
  return { success: "Plan de cuota guardado" };
}
