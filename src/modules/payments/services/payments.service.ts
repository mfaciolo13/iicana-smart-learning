import { db } from "@/lib/drizzle";
import { todayInstitute } from "@/lib/validation";
import { addDaysInstitute } from "@/lib/format";
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
      method: payments.method,
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

/**
 * Cambia el estado de cobranza de un pago que todavía no se cobró.
 *
 * SCRUM-353: sólo se permite sobre pagos no cobrados y no anulados. Un pago
 * cobrado conserva `paidAt`, el método y el número de recibo entregado al
 * alumno; devolverlo a "pendiente" dejaría esos datos huérfanos y permitiría
 * que `markAsPaid` pise el comprobante original. Revertir un cobro se hace
 * anulándolo con motivo (`cancelPayment`), que sí deja rastro.
 *
 * Devuelve `null` si el pago no estaba en un estado modificable, igual que
 * `markAsPaid` y `updatePayment`.
 */
export async function updatePaymentStatus(id: string, status: "pending" | "overdue" | "suspended") {
  const [updated] = await db
    .update(payments)
    .set({ status })
    .where(and(eq(payments.id, id), inArray(payments.status, ["pending", "overdue", "suspended"])))
    .returning();
  return updated ?? null;
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
  const cutoffStr = addDaysInstitute(-15);

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
        isNull(payments.directorAlertSentAt)
      )
    );
}

export async function markOverdueAlertSent(paymentIds: string[]) {
  if (!paymentIds.length) return;
  await db.update(payments).set({ directorAlertSentAt: new Date() }).where(inArray(payments.id, paymentIds));
}

export interface SuspensionTarget {
  paymentId: string;
  studentId: string;
  studentName: string;
}

export async function getSuspensionTargets(): Promise<SuspensionTarget[]> {
  const cutoffStr = addDaysInstitute(-30);

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

/** Cuotas impagas del alumno que cuentan para la restricción de acceso. */
export async function countUnpaidForRestriction(studentId: string): Promise<number> {
  const t = today();
  const [row] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(payments)
    .where(
      and(
        eq(payments.studentId, studentId),
        // Una suspendida cuenta como impaga junto con las vencidas (SCRUM-305). Las
        // pendientes con vencimiento ya pasado también, aunque el cron todavía no las
        // haya marcado: si no, el resultado dependería de cuándo corrió el proceso.
        sql`(${payments.status} = 'suspended' or ${payments.status} = 'overdue'
             or (${payments.status} = 'pending' and ${payments.dueDate} < ${t}))`,
      ),
    );
  return row?.n ?? 0;
}

/**
 * Recalcula la restricción de acceso del alumno a partir de sus cuotas impagas.
 *
 * SCRUM-352: la restricción sólo se ponía (cron de mora y acción manual) y nada la
 * levantaba cuando el alumno regularizaba; el único camino de salida era el botón
 * "Levantar restricción" del detalle. Un alumno al día quedaba sin portal —sin ver
 * notas, asistencia ni sus propios pagos— hasta que alguien se acordara.
 *
 * Con 2 o más cuotas impagas queda restringido; con menos, habilitado. Si estaba
 * suspendido por mora y ya no tiene deuda, vuelve a activo.
 *
 * Devuelve el estado resultante y si cambió respecto del anterior, o null si el
 * alumno no existe.
 */
export async function syncAccessRestriction(
  studentId: string,
): Promise<{ restricted: boolean; lifted: boolean } | null> {
  const [current] = await db
    .select({ accessRestricted: students.accessRestricted, status: students.status })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!current) return null;

  const unpaid = await countUnpaidForRestriction(studentId);
  const restricted = unpaid >= 2;

  // Sólo se reactiva al alumno que fue suspendido por mora: una baja o una suspensión
  // por otro motivo no se revierte sola al cobrar una cuota.
  const reactivate = current.status === "suspended" && unpaid === 0;

  if (current.accessRestricted !== restricted || reactivate) {
    await db
      .update(students)
      .set({
        accessRestricted: restricted,
        ...(reactivate && { status: "active" as const }),
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId));
  }

  return { restricted, lifted: current.accessRestricted && !restricted };
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
