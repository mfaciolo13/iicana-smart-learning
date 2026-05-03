import { db } from "@/lib/drizzle";
import { payments, students, profiles, tutors } from "@/lib/drizzle/schema";
import { eq, desc, and, lt, sql, inArray, isNull } from "drizzle-orm";
import type { CreatePaymentInput, MarkAsPaidInput } from "../schemas";
import type { PaymentListItem, PaymentWithStudent } from "../types";

const today = () => new Date().toISOString().split("T")[0];

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
          : eq(payments.status, status as "pending" | "paid" | "overdue" | "suspended")
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

export async function markAsPaid(input: MarkAsPaidInput) {
  const [updated] = await db
    .update(payments)
    .set({
      status: "paid",
      paidAt: new Date(),
      method: input.method,
      receiptNumber: input.receiptNumber ?? null,
    })
    .where(eq(payments.id, input.id))
    .returning();
  return updated;
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
  tutorProfileId: string | null;
}

export async function getOverdueAlertTargets(): Promise<OverdueAlertTarget[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 15);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const rows = await db
    .select({
      paymentId: payments.id,
      studentName: profiles.fullName,
      tutorProfileId: tutors.profileId,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .leftJoin(tutors, eq(students.tutorId, tutors.id))
    .where(
      and(
        inArray(payments.status, ["pending", "overdue"]),
        lt(payments.dueDate, cutoffStr),
        isNull(payments.overdueAlertSentAt)
      )
    );

  return rows.map((r) => ({ ...r, tutorProfileId: r.tutorProfileId ?? null }));
}

export async function markOverdueAlertSent(paymentIds: string[]) {
  if (!paymentIds.length) return;
  await db.update(payments).set({ overdueAlertSentAt: new Date() }).where(inArray(payments.id, paymentIds));
}

export interface SuspensionTarget {
  paymentId: string;
  studentId: string;
  studentName: string;
  tutorProfileId: string | null;
}

export async function getSuspensionTargets(): Promise<SuspensionTarget[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const rows = await db
    .select({
      paymentId: payments.id,
      studentId: students.id,
      studentName: profiles.fullName,
      tutorProfileId: tutors.profileId,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .leftJoin(tutors, eq(students.tutorId, tutors.id))
    .where(
      and(
        inArray(payments.status, ["pending", "overdue"]),
        lt(payments.dueDate, cutoffStr)
      )
    );

  return rows.map((r) => ({ ...r, tutorProfileId: r.tutorProfileId ?? null }));
}

export async function suspendStudentAndPayments(studentId: string, paymentIds: string[]) {
  await db.update(payments).set({ status: "suspended" }).where(inArray(payments.id, paymentIds));
  await db
    .update(students)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(students.id, studentId));
}

export async function getPaymentSummary() {
  const [row] = await db
    .select({
      pending: sql<number>`cast(sum(case when ${payments.status} = 'pending' then 1 else 0 end) as int)`,
      paid: sql<number>`cast(sum(case when ${payments.status} = 'paid' then 1 else 0 end) as int)`,
      overdue: sql<number>`cast(sum(case when (${payments.status} = 'overdue' or (${payments.status} = 'pending' and ${payments.dueDate} < current_date)) then 1 else 0 end) as int)`,
      totalPendingAmount: sql<string>`coalesce(sum(case when ${payments.status} in ('pending','overdue') then ${payments.amount} else 0 end), 0)::text`,
    })
    .from(payments);

  return row;
}
