"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentActor } from "@/lib/audit";
import { deliverEmails, retryPendingEmails } from "@/lib/outbox";
import type { ActionResult } from "@/lib/action-result";
import {
  CashError,
  recordReconciliation,
  registerManualIncome,
  registerOpeningBalance,
  registerWithdrawal,
  reverseMovement,
} from "./services/cash.service";
import { toCents } from "@/lib/money";

/** "12.500,50" / "12500,5" / "12500.50" → centavos; rechaza texto, negativos y más de 2 decimales. */
const moneyField = (label: string, { allowZero = false } = {}) =>
  z
    .string()
    .trim()
    .min(1, `Ingresá el ${label}`)
    .transform((v) => (v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `El ${label} no es válido (usá hasta 2 decimales)`)
    .transform((v) => toCents(v))
    .refine((c) => (allowZero ? c >= 0 : c > 0), `El ${label} debe ser mayor a 0`)
    .refine((c) => c <= 99_999_999_99, `El ${label} es demasiado alto`);

const reasonField = z.string().trim().min(3, "Indicá el motivo (mínimo 3 caracteres)").max(200, "El motivo no puede superar los 200 caracteres");
const observationsField = z.string().trim().max(500, "Las observaciones no pueden superar los 500 caracteres").optional();

const movementSchema = z.object({
  amount: moneyField("importe"),
  reason: reasonField,
  observations: observationsField,
});

function fail(error: import("zod").ZodError): ActionResult {
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return {
    error: error.issues[0].message,
    fieldErrors: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0]]).filter(([, v]) => v)) as Record<string, string>,
  };
}

function revalidateCash() {
  revalidatePath("/director/payments/cash");
  revalidatePath("/administrativo/payments/cash");
}

const field = (formData: FormData, key: string) => ((formData.get(key) as string | null) ?? "") || undefined;

export async function registerCashIncomeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["administrativo"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = movementSchema.safeParse({ amount: field(formData, "amount") ?? "", reason: field(formData, "reason") ?? "", observations: field(formData, "observations") });
  if (!parsed.success) return fail(parsed.error);

  try {
    await registerManualIncome({ amountCents: parsed.data.amount, reason: parsed.data.reason, observations: parsed.data.observations, actor });
  } catch (e) {
    if (e instanceof CashError) return { error: e.message };
    return { error: "No se pudo registrar el ingreso. Intentá de nuevo." };
  }
  revalidateCash();
  return { success: "Ingreso registrado en la caja" };
}

export async function registerCashWithdrawalAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["administrativo"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = movementSchema.safeParse({ amount: field(formData, "amount") ?? "", reason: field(formData, "reason") ?? "", observations: field(formData, "observations") });
  if (!parsed.success) return fail(parsed.error);

  let emailIds: string[];
  try {
    ({ emailIds } = await registerWithdrawal({ amountCents: parsed.data.amount, reason: parsed.data.reason, observations: parsed.data.observations, actor }));
  } catch (e) {
    if (e instanceof CashError) return { error: e.message };
    return { error: "No se pudo registrar el retiro. Intentá de nuevo." };
  }

  // El retiro ya está guardado y el aviso encolado: si el correo falla queda pendiente de reintento.
  const { failed } = await deliverEmails(emailIds);
  revalidateCash();
  return {
    success:
      failed > 0
        ? "Retiro registrado · El aviso a Dirección quedó pendiente de envío y se reintentará"
        : "Retiro registrado · Se avisó a Dirección por correo",
  };
}

export async function registerOpeningBalanceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = z.object({ amount: moneyField("saldo inicial"), observations: observationsField }).safeParse({
    amount: field(formData, "amount") ?? "",
    observations: field(formData, "observations"),
  });
  if (!parsed.success) return fail(parsed.error);

  try {
    await registerOpeningBalance({ amountCents: parsed.data.amount, observations: parsed.data.observations, actor });
  } catch (e) {
    if (e instanceof CashError) return { error: e.message };
    return { error: "No se pudo registrar el saldo inicial." };
  }
  revalidateCash();
  return { success: "Saldo inicial registrado" };
}

export async function reverseCashMovementAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = z
    .object({
      movementId: z.uuid("Movimiento inválido"),
      reason: z.string().trim().min(10, "Explicá el motivo de la reversión (mínimo 10 caracteres)").max(200, "El motivo no puede superar los 200 caracteres"),
    })
    .safeParse({ movementId: field(formData, "movementId") ?? "", reason: field(formData, "reason") ?? "" });
  if (!parsed.success) return fail(parsed.error);

  try {
    await reverseMovement({ movementId: parsed.data.movementId, reason: parsed.data.reason, actor });
  } catch (e) {
    if (e instanceof CashError) return { error: e.message };
    return { error: "No se pudo revertir el movimiento." };
  }
  revalidateCash();
  return { success: "Movimiento revertido con un asiento compensatorio" };
}

export async function recordCashReconciliationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = z
    .object({ counted: moneyField("efectivo contado", { allowZero: true }), notes: observationsField })
    .safeParse({ counted: field(formData, "counted") ?? "", notes: field(formData, "notes") });
  if (!parsed.success) return fail(parsed.error);

  const row = await recordReconciliation({ countedCents: parsed.data.counted, notes: parsed.data.notes, actor });
  revalidateCash();
  const diff = Number(row.difference);
  return {
    success: diff === 0 ? "Conciliación registrada: la caja coincide con el conteo" : `Conciliación registrada con una diferencia de $ ${row.difference}`,
  };
}

/** Reintenta los correos pendientes o fallidos (aviso de retiros y comprobantes). */
export async function retryPendingEmailsAction(_prev: ActionResult): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);
  const { sent, failed } = await retryPendingEmails({ force: true });
  revalidateCash();
  if (sent === 0 && failed === 0) return { success: "No hay correos pendientes" };
  return failed > 0 ? { error: `${sent} enviado(s), ${failed} siguen fallando` } : { success: `${sent} correo(s) enviado(s)` };
}
