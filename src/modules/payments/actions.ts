"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { createPaymentSchema, markAsPaidSchema, updatePaymentStatusSchema } from "./schemas";
import {
  createPayment,
  markAsPaid,
  updatePaymentStatus,
  markOverduePayments,
} from "./services/payments.service";
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
  redirect(`/admin/payments/${payment.id}`);
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
  redirect(`/admin/payments/${parsed.data.id}`);
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
  redirect(`/admin/payments/${parsed.data.id}`);
}

export async function markOverduePaymentsAction(_prev: ActionResult): Promise<ActionResult> {
  await requireRole(["admin"]);
  await markOverduePayments();
  revalidatePath("/admin/payments");
  return { success: "Pagos vencidos actualizados" };
}
