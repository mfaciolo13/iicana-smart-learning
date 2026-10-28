"use server";

import { revalidatePath } from "next/cache";
import { requireRole, getServerProfile } from "@/lib/auth/helpers";
import { createPaymentSchema, markAsPaidSchema, updatePaymentStatusSchema, updatePaymentSchema, cancelPaymentSchema } from "./schemas";
import {
  createPayment,
  markAsPaid,
  updatePayment,
  cancelPayment,
  updatePaymentStatus,
  markOverduePayments,
  getOverdueAlertTargets,
  markOverdueAlertSent,
  getSuspensionTargets,
  suspendStudentAndPayments,
  paymentExistsForDueDate,
  syncAccessRestriction,
} from "./services/payments.service";
import { portalPath } from "@/lib/portal";
import { sendToRole } from "@/modules/notifications/services/notifications.service";
import { isUniqueViolation } from "@/lib/db-errors";
import type { ActionResult } from "@/lib/action-result";
import { refreshAnalytics } from "@/lib/analytics-cache";

export async function createPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const role = await requireRole(["director", "administrativo"]);

  const raw = {
    studentId: formData.get("studentId") as string,
    amount: formData.get("amount") as string,
    dueDate: formData.get("dueDate") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = createPaymentSchema.safeParse(raw);
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

  // Dos cuotas del mismo alumno con el mismo vencimiento casi siempre son una carga duplicada (SCRUM-324).
  if (await paymentExistsForDueDate(parsed.data.studentId, parsed.data.dueDate)) {
    return { error: "Ese alumno ya tiene una cuota con ese vencimiento" };
  }

  let payment;
  try {
    payment = await createPayment(parsed.data);
  } catch (e) {
    // Índice único (alumno, vencimiento): si dos pedidos llegan a la vez, gana uno solo.
    if ((e as { code?: string; cause?: { code?: string } })?.code === "23505" || (e as { cause?: { code?: string } })?.cause?.code === "23505") {
      return { error: "Ese alumno ya tiene una cuota con ese vencimiento" };
    }
    throw e;
  }

  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  return { success: "Pago registrado correctamente", redirectTo: portalPath(role, `/payments/${payment.id}`) };
}

export async function markAsPaidAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const raw = {
    id: formData.get("id") as string,
    method: formData.get("method") as string,
    receiptNumber: (formData.get("receiptNumber") as string) || undefined,
  };

  const parsed = markAsPaidSchema.safeParse(raw);
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

  let habilitado = false;
  try {
    const paid = await markAsPaid(parsed.data);
    if (!paid) {
      return { error: "Solo se pueden cobrar pagos pendientes, vencidos o suspendidos. Este pago ya fue cobrado o anulado." };
    }
    // SCRUM-352: cobrar es lo que saca al alumno de la mora, así que es acá donde
    // hay que recalcular la restricción. Antes solo se ponía y nunca se levantaba.
    const sync = await syncAccessRestriction(paid.studentId);
    habilitado = sync?.lifted ?? false;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "Ya existe un pago con ese número de recibo" };
    }
    return { error: "No se pudo registrar el pago. Intentá de nuevo." };
  }

  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  revalidatePath("/alumno/payments");
  return {
    success: habilitado
      ? "Pago registrado como abonado · Se habilitó el acceso del alumno al portal"
      : "Pago registrado como abonado",
  };
}

export async function updatePaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const raw = {
    id: formData.get("id") as string,
    amount: formData.get("amount") as string,
    dueDate: formData.get("dueDate") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = updatePaymentSchema.safeParse(raw);
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

  const { id, ...data } = parsed.data;
  const updated = await updatePayment(id, data);
  if (!updated) {
    return { error: "Solo se puede editar un pago pendiente o vencido. Anulá el pago y registrá uno nuevo." };
  }

  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  return { success: "Pago actualizado correctamente" };
}

export async function cancelPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);

  const profile = await getServerProfile();
  if (!profile) return { error: "No autorizado" };

  const parsed = cancelPaymentSchema.safeParse({
    id: formData.get("id") as string,
    reason: (formData.get("reason") as string) ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const cancelled = await cancelPayment(parsed.data.id, parsed.data.reason, profile.id);
  if (!cancelled) {
    return { error: "El pago ya estaba anulado" };
  }

  // Anular una cuota la saca de la deuda, así que puede bajar al alumno de 2 impagas
  // a 1 y corresponde levantarle la restricción (SCRUM-352).
  await syncAccessRestriction(cancelled.studentId);

  refreshAnalytics();
  revalidatePath("/director/payments");
  revalidatePath("/administrativo/payments");
  revalidatePath("/alumno/payments");
  return { success: "Pago anulado correctamente" };
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
