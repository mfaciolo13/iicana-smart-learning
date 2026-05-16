"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { createPaymentSchema, markAsPaidSchema, updatePaymentStatusSchema } from "./schemas";
import {
  createPayment,
  markAsPaid,
  updatePaymentStatus,
  markOverduePayments,
  getOverdueAlertTargets,
  markOverdueAlertSent,
  getSuspensionTargets,
  suspendStudentAndPayments,
} from "./services/payments.service";
import { sendToRole } from "@/modules/notifications/services/notifications.service";
import type { ActionResult } from "@/lib/action-result";

export async function createPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    studentId: formData.get("studentId") as string,
    amount: formData.get("amount") as string,
    dueDate: formData.get("dueDate") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = createPaymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const payment = await createPayment(parsed.data);

  revalidatePath("/admin/payments");
  return { success: "Pago registrado correctamente", redirectTo: `/admin/payments/${payment.id}` };
}

export async function markAsPaidAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    method: formData.get("method") as string,
    receiptNumber: (formData.get("receiptNumber") as string) || undefined,
  };

  const parsed = markAsPaidSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await markAsPaid(parsed.data);

  revalidatePath("/admin/payments");
  return { success: "Pago registrado como abonado" };
}

export async function updatePaymentStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const raw = {
    id: formData.get("id") as string,
    status: formData.get("status") as string,
  };

  const parsed = updatePaymentStatusSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await updatePaymentStatus(parsed.data.id, parsed.data.status as "pending" | "overdue" | "suspended");

  revalidatePath("/admin/payments");
  return { success: "Estado actualizado" };
}

export async function markOverduePaymentsAction(_prev: ActionResult): Promise<ActionResult> {
  await requireRole(["admin"]);
  await markOverduePayments();
  revalidatePath("/admin/payments");
  return { success: "Pagos vencidos actualizados" };
}

export async function runOverdueChecksAction(_prev: ActionResult, _formData?: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  await markOverduePayments();

  const alertTargets = await getOverdueAlertTargets();
  for (const t of alertTargets) {
    const payload = {
      type: "payment" as const,
      title: "Alerta de mora",
      body: `${t.studentName} tiene un pago vencido hace más de 15 días.`,
    };
    await sendToRole("admin", payload);
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
    await sendToRole("admin", payload);
    suspended++;
  }

  revalidatePath("/admin/payments");
  const parts: string[] = [];
  if (alertTargets.length > 0) parts.push(`${alertTargets.length} alerta(s) de mora enviada(s)`);
  if (suspended > 0) parts.push(`${suspended} alumno(s) suspendido(s)`);
  return { success: parts.length > 0 ? parts.join(", ") : "Sin cambios pendientes" };
}
