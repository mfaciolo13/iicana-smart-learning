import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { courses, enrollments, paymentDocuments, payments, profiles, students } from "@/lib/drizzle/schema";
import type { DbExecutor } from "@/lib/audit";

/** Token opaco para el enlace seguro de descarga (no adivinable). */
export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export type PaymentDocument = typeof paymentDocuments.$inferSelect;

/**
 * Crea el comprobante interno de un pago, una sola vez. Si ya existe devuelve el existente,
 * así un reintento o una notificación repetida nunca genera un segundo comprobante.
 */
export async function ensureReceipt(tx: DbExecutor, p: { paymentId: string; amount: string }): Promise<PaymentDocument> {
  const [existing] = await tx
    .select()
    .from(paymentDocuments)
    .where(and(eq(paymentDocuments.paymentId, p.paymentId), eq(paymentDocuments.documentType, "receipt")))
    .limit(1);
  if (existing) return existing;

  const seq = await tx.execute<{ n: string }>(sql`select nextval('payment_receipt_seq')::text as n`);
  const n = (seq as unknown as { n: string }[])[0].n;
  const [created] = await tx
    .insert(paymentDocuments)
    .values({
      paymentId: p.paymentId,
      documentType: "receipt",
      documentNumber: `REC-${n.padStart(8, "0")}`,
      fiscalStatus: "not_required",
      amount: p.amount,
      issuedAt: new Date(),
      accessToken: newAccessToken(),
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await tx
    .select()
    .from(paymentDocuments)
    .where(and(eq(paymentDocuments.paymentId, p.paymentId), eq(paymentDocuments.documentType, "receipt")))
    .limit(1);
  return again;
}

export async function getDocumentsForPayment(paymentId: string): Promise<PaymentDocument[]> {
  return db.select().from(paymentDocuments).where(eq(paymentDocuments.paymentId, paymentId));
}

export interface ReceiptData {
  paymentId: string;
  status: string;
  period: string | null;
  dueDate: string;
  paidAt: Date | null;
  method: "cash" | "transfer" | "card" | null;
  listPrice: string | null;
  discountAmount: string | null;
  discountPercentage: string | null;
  surchargeAmount: string | null;
  finalAmount: string | null;
  /** N.º de recibo cargado a mano al cobrar (libro de recibos de la academia). */
  manualReceiptNumber: string | null;
  internalReference: string | null;
  providerPaymentId: string | null;
  notes: string | null;
  studentId: string;
  studentName: string;
  studentDni: string;
  studentEmail: string;
  courseName: string | null;
  receipt: PaymentDocument | null;
  invoice: PaymentDocument | null;
}

/** Datos para imprimir el comprobante de un pago (incluye pagos viejos sin documento propio). */
export async function getReceiptData(paymentId: string): Promise<ReceiptData | null> {
  const [row] = await db
    .select({
      paymentId: payments.id,
      studentId: payments.studentId,
      courseId: payments.courseId,
      status: payments.status,
      period: payments.period,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      method: payments.method,
      amount: payments.amount,
      listPrice: payments.listPriceSnapshot,
      discountAmount: payments.discountAmount,
      discountPercentage: payments.discountPercentage,
      surchargeAmount: payments.surchargeAmount,
      finalAmount: payments.finalAmount,
      manualReceiptNumber: payments.receiptNumber,
      internalReference: payments.internalReference,
      providerPaymentId: payments.providerPaymentId,
      notes: payments.notes,
      studentName: profiles.fullName,
      studentDni: students.dni,
      studentEmail: profiles.email,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!row) return null;

  const docs = await getDocumentsForPayment(paymentId);
  const { amount, courseId, ...rest } = row;
  return {
    ...rest,
    // Pagos anteriores al módulo nuevo: sin desglose, el importe cobrado es `amount`.
    listPrice: row.listPrice ?? amount,
    finalAmount: row.finalAmount ?? (row.status === "paid" ? amount : null),
    courseName: await resolveCourseName(courseId, row.studentId),
    receipt: docs.find((d) => d.documentType === "receipt") ?? null,
    invoice: docs.find((d) => d.documentType === "invoice_c") ?? null,
  };
}

/** Comprobante o factura a partir del token de acceso de un enlace de correo. */
export async function getReceiptDataByToken(token: string): Promise<{ data: ReceiptData; kind: "receipt" | "invoice_c" } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [doc] = await db.select().from(paymentDocuments).where(eq(paymentDocuments.accessToken, token)).limit(1);
  if (!doc) return null;
  const data = await getReceiptData(doc.paymentId);
  return data ? { data, kind: doc.documentType as "receipt" | "invoice_c" } : null;
}

/** Curso de la cuota; si no lo trae, el de la inscripción activa del alumno. */
export async function resolveCourseName(courseId: string | null, studentId: string): Promise<string | null> {
  if (courseId) {
    const [c] = await db.select({ name: courses.name }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (c) return c.name;
  }
  const [e] = await db
    .select({ name: courses.name })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.status, "active")))
    .limit(1);
  return e?.name ?? null;
}
