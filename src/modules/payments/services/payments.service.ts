import { db } from "@/lib/drizzle";
import { todayInstitute } from "@/lib/validation";
import { payments, students, profiles } from "@/lib/drizzle/schema";
import { eq, ne, desc, and, lt, gte, sql, inArray, isNull } from "drizzle-orm";
import type { CreatePaymentInput, MarkAsPaidInput } from "../schemas";
import type { PaymentListItem, PaymentWithStudent } from "../types";

// Fecha de hoy en la zona horaria del instituto (con UTC, a partir de las 21:00 ya era "mañana").
const today = () => todayInstitute();

export async function getPayments(status?: string): Promise<PaymentListItem[]> {
  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      status: payments.status,
      receiptNumber: payments.receiptNumber,
      studentName: profiles.fullName,
      studentDni: students.dni,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(
      status && status !== "all"
        ? status === "overdue"
          ? and(
              inArray(payments.status, ["pending", "overdue"]),
              lt(payments.dueDate, today())
            )
          : status === "pending"
            ? and(inArray(payments.status, ["pending", "overdue"]), gte(payments.dueDate, today()))
            : eq(payments.status, status as "pending" | "paid" | "overdue" | "suspended" | "cancelled")
        : undefined
    )
    .orderBy(desc(payments.dueDate));

  return rows.map((r) => ({
    ...r,
    isOverdue:
      (r.status === "pending" || r.status === "overdue") &&
      r.dueDate < today(),
  })) as PaymentListItem[];
}

export async function getPaymentsByStudent(studentId: string): Promise<PaymentListItem[]> {
  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      status: payments.status,
      receiptNumber: payments.receiptNumber,
      studentName: profiles.fullName,
      studentDni: students.dni,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(payments.studentId, studentId))
    .orderBy(desc(payments.dueDate));

  return rows.map((r) => ({
    ...r,
    isOverdue:
      (r.status === "pending" || r.status === "overdue") &&
      r.dueDate < today(),
  })) as PaymentListItem[];
}

export async function getPaymentById(id: string): Promise<PaymentWithStudent | null> {
  const rows = await db
    .select({
      id: payments.id,
      studentId: payments.studentId,
      amount: payments.amount,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      method: payments.method,
      status: payments.status,
      receiptNumber: payments.receiptNumber,
      notes: payments.notes,
      createdAt: payments.createdAt,
      cancelledAt: payments.cancelledAt,
      cancellationReason: payments.cancellationReason,
      studentName: profiles.fullName,
      studentDni: students.dni,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(payments.id, id))
    .limit(1);

  return (rows[0] as PaymentWithStudent) ?? null;
}

export async function createPayment(input: CreatePaymentInput) {
  const [payment] = await db
    .insert(payments)
    .values({
      studentId: input.studentId,
      amount: String(input.amount),
      dueDate: input.dueDate,
      notes: input.notes ?? null,
      status: "pending",
    })
    .returning();
  return payment;
}

/**
 * Registra el cobro de un pago. Solo aplica a pagos adeudados (pendiente, vencido o
 * suspendido por mora): un pago ya cobrado o anulado no puede "resucitar" ni pisar
 * su fecha, método y recibo originales (SCRUM-249). Devuelve null si no corresponde.
 */
export async function markAsPaid(input: MarkAsPaidInput) {
  const [updated] = await db
    .update(payments)
    .set({
      status: "paid",
      paidAt: new Date(),
      method: input.method,
      receiptNumber: input.receiptNumber ?? null,
    })
    .where(and(eq(payments.id, input.id), inArray(payments.status, ["pending", "overdue", "suspended"])))
    .returning();
  return updated ?? null;
}

/**
 * Edita los datos de un pago. Solo se permite sobre pagos no cobrados: una vez
 * abonado, el monto y el vencimiento ya se plasmaron en un recibo entregado al
 * alumno, así que corregirlos silenciosamente falsearía ese comprobante. Para
 * corregir un pago cobrado hay que anularlo y registrar uno nuevo.
 */
export async function updatePayment(
  id: string,
  input: { amount: number; dueDate: string; notes?: string | null }
) {
  const [updated] = await db
    .update(payments)
    .set({
      amount: String(input.amount),
      dueDate: input.dueDate,
      notes: input.notes ?? null,
    })
    .where(and(eq(payments.id, id), inArray(payments.status, ["pending", "overdue"])))
    .returning();
  return updated ?? null;
}

/**
 * Anula un pago. No lo borra: conserva el registro con el motivo, quién lo anuló
 * y cuándo. Un pago anulado queda fuera de los totales de recaudación y de mora,
 * y no vuelve a dispararse contra él ninguna automatización de cobranza.
 */
export async function cancelPayment(id: string, reason: string, cancelledBy: string) {
  const [cancelled] = await db
    .update(payments)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: reason,
    })
    .where(and(eq(payments.id, id), ne(payments.status, "cancelled")))
    .returning();
  return cancelled ?? null;
}

export async function updatePaymentStatus(id: string, status: "pending" | "overdue" | "suspended") {
  const [updated] = await db
    .update(payments)
    .set({ status })
    .where(eq(payments.id, id))
    .returning();
  return updated;
}

export async function markOverduePayments() {
  const updated = await db
    .update(payments)
    .set({ status: "overdue" })
    .where(
      and(
        eq(payments.status, "pending"),
        lt(payments.dueDate, today())
      )
    )
    .returning({ id: payments.id });
  return updated.length;
}

export interface OverdueAlertTarget {
  paymentId: string;
  studentName: string;
}

export async function getOverdueAlertTargets(): Promise<OverdueAlertTarget[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return db
    .select({
      paymentId: payments.id,
      studentName: profiles.fullName,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(
      and(
        inArray(payments.status, ["pending", "overdue"]),
        lt(payments.dueDate, cutoffStr),
        isNull(payments.overdueAlertSentAt)
      )
    );
}

export async function markOverdueAlertSent(paymentIds: string[]) {
  if (!paymentIds.length) return;
  await db.update(payments).set({ overdueAlertSentAt: new Date() }).where(inArray(payments.id, paymentIds));
}

export interface SuspensionTarget {
  paymentId: string;
  studentId: string;
  studentName: string;
}

export async function getSuspensionTargets(): Promise<SuspensionTarget[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return db
    .select({
      paymentId: payments.id,
      studentId: students.id,
      studentName: profiles.fullName,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(
      and(
        inArray(payments.status, ["pending", "overdue"]),
        lt(payments.dueDate, cutoffStr)
      )
    );
}

export async function suspendStudentAndPayments(studentId: string, paymentIds: string[]) {
  await db.update(payments).set({ status: "suspended" }).where(inArray(payments.id, paymentIds));
  await db
    .update(students)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(students.id, studentId));
}

/**
 * Resumen de cuotas. Los estados son excluyentes y suman el total (SCRUM-285):
 * pendiente = sin cobrar y con vencimiento de hoy en adelante; vencida = sin cobrar y con
 * vencimiento anterior a hoy (aunque el status todavía diga "pending"); más pagadas,
 * suspendidas y anuladas. El mismo criterio usan los dashboards.
 */
export async function getPaymentSummary() {
  const t = today();
  const unpaid = sql`${payments.status} in ('pending','overdue')`;
  const [row] = await db
    .select({
      pending: sql<number>`cast(coalesce(sum(case when ${unpaid} and ${payments.dueDate} >= ${t} then 1 else 0 end), 0) as int)`,
      overdue: sql<number>`cast(coalesce(sum(case when ${unpaid} and ${payments.dueDate} < ${t} then 1 else 0 end), 0) as int)`,
      paid: sql<number>`cast(coalesce(sum(case when ${payments.status} = 'paid' then 1 else 0 end), 0) as int)`,
      suspended: sql<number>`cast(coalesce(sum(case when ${payments.status} = 'suspended' then 1 else 0 end), 0) as int)`,
      cancelled: sql<number>`cast(coalesce(sum(case when ${payments.status} = 'cancelled' then 1 else 0 end), 0) as int)`,
      total: sql<number>`cast(count(*) as int)`,
      // La deuda incluye las cuotas suspendidas (SCRUM-289).
      totalPendingAmount: sql<string>`coalesce(sum(case when ${payments.status} in ('pending','overdue','suspended') then ${payments.amount} else 0 end), 0)::text`,
    })
    .from(payments);

  return row;
}

/** Ya hay una cuota vigente (no anulada) del alumno con ese vencimiento. */
export async function paymentExistsForDueDate(studentId: string, dueDate: string): Promise<boolean> {
  const [row] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.studentId, studentId), eq(payments.dueDate, dueDate), ne(payments.status, "cancelled")))
    .limit(1);
  return !!row;
}
