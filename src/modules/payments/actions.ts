"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentActor } from "@/lib/audit";
import {
  createPaymentSchema,
  markAsPaidSchema,
  updatePaymentStatusSchema,
  updatePaymentSchema,
  cancelPaymentSchema,
} from "./schemas";
import {
  createPayment,
  updatePayment,
  updatePaymentStatus,
  markOverduePayments,
  getOverdueAlertTargets,
  markOverdueAlertSent,
  getSuspensionTargets,
  suspendStudentAndPayments,
  paymentExistsForDueDate,
  syncAccessRestriction,
} from "./services/payments.service";
import { afterPaymentConfirmed, cancelPaymentWithCash, collectPayment } from "./services/collect.service";
import { toCents } from "@/lib/money";
import { portalPath } from "@/lib/portal";
import { sendToRole } from "@/modules/notifications/services/notifications.service";
import { isUniqueViolation } from "@/lib/db-errors";
import type { ActionResult } from "@/lib/action-result";
import { refreshAnalytics } from "@/lib/analytics-cache";

/** Errores de validación Zod → mensaje + errores por campo, como el resto de los formularios. */
function validationResult(error: import("zod").ZodError): ActionResult {
  const flat = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return {
    error: error.issues[0].message,
    fieldErrors: Object.fromEntries(
      Object.entries(flat)
        .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
        .filter(([, v]) => v),
    ) as Record<string, string>,
  };
}

function revalidatePayments() {
  refreshAnalytics();
  for (const base of ["/director", "/administrativo", "/alumno"]) revalidatePath(`${base}/payments`);
}

const text = (formData: FormData, key: string) => ((formData.get(key) as string | null) ?? "") || undefined;

export async function createPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);
  const actor = await getCurrentActor();

  const parsed = createPaymentSchema.safeParse({
    studentId: formData.get("studentId") as string,
    amount: formData.get("amount") as string,
    transferPrice: formData.get("transferPrice") as string,
    cashPrice: formData.get("cashPrice") as string,
    courseId: formData.get("courseId") as string,
    dueDate: formData.get("dueDate") as string,
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return validationResult(parsed.error);

  // Dos cuotas del mismo alumno con el mismo vencimiento casi siempre son una carga duplicada (SCRUM-324).
  if (await paymentExistsForDueDate(parsed.data.studentId, parsed.data.dueDate)) {
    return { error: "Ese alumno ya tiene una cuota con ese vencimiento" };
  }

  let payment;
  try {
    payment = await createPayment(parsed.data, actor?.id);
  } catch (e) {
    // Índice único (alumno, vencimiento): si dos pedidos llegan a la vez, gana uno solo.
    if (isUniqueViolation(e)) return { error: "Ese alumno ya tiene una cuota con ese vencimiento" };
    throw e;
  }

  revalidatePayments();
  return { success: "Cuota registrada correctamente", redirectTo: portalPath(role, `/payments/${payment.id}`) };
}

/**
 * Cobro manual de una cuota. El importe que mostró la pantalla viaja solo para compararlo: el
 * servidor lo recalcula con la fecha del instituto y rechaza el cobro si no coincide.
 */
export async function markAsPaidAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = markAsPaidSchema.safeParse({
    id: formData.get("id") as string,
    method: formData.get("method") as string,
    receiptNumber: text(formData, "receiptNumber"),
    expectedAmount: text(formData, "expectedAmount"),
    externalReference: text(formData, "externalReference"),
    observations: text(formData, "observations"),
  });
  if (!parsed.success) return validationResult(parsed.error);

  let result;
  try {
    result = await collectPayment({
      paymentId: parsed.data.id,
      method: parsed.data.method,
      actor,
      provider: "manual",
      expectedFinalCents: parsed.data.expectedAmount ? toCents(parsed.data.expectedAmount) : undefined,
      receiptNumber: parsed.data.receiptNumber,
      externalReference: parsed.data.externalReference,
      observations: parsed.data.observations,
    });
  } catch {
    return { error: "No se pudo registrar el pago. Intentá de nuevo." };
  }
  if (!result.ok) return { error: result.message };

  // SCRUM-352: cobrar es lo que saca al alumno de la mora, así que se recalcula la restricción.
  const { restrictionLifted } = await afterPaymentConfirmed(result);

  revalidatePayments();
  return {
    success: restrictionLifted
      ? "Pago registrado como abonado · Se habilitó el acceso del alumno al portal"
      : "Pago registrado como abonado",
  };
}

export async function updatePaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const parsed = updatePaymentSchema.safeParse({
    id: formData.get("id") as string,
    amount: formData.get("amount") as string,
    transferPrice: formData.get("transferPrice") as string,
    cashPrice: formData.get("cashPrice") as string,
    dueDate: formData.get("dueDate") as string,
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return validationResult(parsed.error);

  const { id, ...data } = parsed.data;
  const updated = await updatePayment(id, data);
  if (!updated) {
    return { error: "Solo se puede editar un pago pendiente o vencido. Anulá el pago y registrá uno nuevo." };
  }

  revalidatePayments();
  return { success: "Pago actualizado correctamente" };
}

export async function cancelPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = cancelPaymentSchema.safeParse({
    id: formData.get("id") as string,
    reason: (formData.get("reason") as string) ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const cancelled = await cancelPaymentWithCash({ paymentId: parsed.data.id, reason: parsed.data.reason, actor });
  if (!cancelled) return { error: "El pago ya estaba anulado" };

  // Anular una cuota la saca de la deuda, así que puede bajar al alumno de 2 impagas
  // a 1 y corresponde levantarle la restricción (SCRUM-352).
  await syncAccessRestriction(cancelled.payment.studentId);

  revalidatePayments();
  revalidatePath("/director/payments/cash");
  revalidatePath("/administrativo/payments/cash");
  return {
    success: cancelled.cashReversed
      ? "Pago anulado · Se revirtió su ingreso en la caja de efectivo"
      : "Pago anulado correctamente",
  };
}

export async function updatePaymentStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updatePaymentStatusSchema.safeParse(raw);
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

  // El schema ya acota los estados posibles, así que no hace falta castear: el
  // cast anterior silenciaba a TypeScript y dejaba pasar "paid" (SCRUM-353).
  const updated = await updatePaymentStatus(parsed.data.id, parsed.data.status);
  if (!updated) {
    return { error: "Solo se puede cambiar el estado de un pago no cobrado. Para revertir un cobro, anulalo." };
  }

  // Cambiar el estado de cobranza mueve la cuenta de impagas en los dos sentidos:
  // puede restringir al alumno o habilitarlo (SCRUM-352).
  await syncAccessRestriction(updated.studentId);

  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  return { success: "Estado actualizado" };
}

export async function markOverduePaymentsAction(_prev: ActionResult): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);
  await markOverduePayments();
  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  return { success: "Pagos vencidos actualizados" };
}

export async function runOverdueChecksAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  await markOverduePayments();

  const alertTargets = await getOverdueAlertTargets();
  for (const t of alertTargets) {
    const payload = {
      type: "payment" as const,
      title: "Alerta de mora",
      body: `${t.studentName} tiene un pago vencido hace más de 15 días.`,
    };
    await sendToRole("director", payload);
  }
  if (alertTargets.length > 0) {
    await markOverdueAlertSent(alertTargets.map((t) => t.paymentId));
  }

  const suspensionTargets = await getSuspensionTargets();
  const byStudent = new Map<string, typeof suspensionTargets>();
  for (const t of suspensionTargets) {
    const list = byStudent.get(t.studentId) ?? [];
    list.push(t);
    byStudent.set(t.studentId, list);
  }
  let suspended = 0;
  for (const [studentId, items] of byStudent.entries()) {
    await suspendStudentAndPayments(studentId, items.map((i) => i.paymentId));
    const { studentName } = items[0];
    const payload = {
      type: "payment" as const,
      title: "Alumno suspendido por mora",
      body: `${studentName} fue suspendido por tener pagos vencidos hace más de 30 días.`,
    };
    await sendToRole("director", payload);
    suspended++;
  }

  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  const parts: string[] = [];
  if (alertTargets.length > 0) parts.push(`${alertTargets.length} alerta(s) de mora enviada(s)`);
  if (suspended > 0) parts.push(`${suspended} alumno(s) suspendido(s)`);
  return { success: parts.length > 0 ? parts.join(", ") : "Sin cambios pendientes" };
}
