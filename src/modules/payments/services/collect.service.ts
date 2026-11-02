import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { dbTx } from "@/lib/drizzle";
import { payments, profiles, students } from "@/lib/drizzle/schema";
import { recordAudit, type Actor, type DbExecutor } from "@/lib/audit";
import { enqueueEmails, deliverEmails } from "@/lib/outbox";
import { fromCents } from "@/lib/money";
import { todayInstitute } from "@/lib/validation";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  defaultDiscountValidUntil,
  quotePayment,
  quoteToColumns,
  type FeePrices,
  type PaymentMethodKey,
  type PriceQuote,
} from "../lib/pricing";
import { publicBaseUrl, receiptEmail } from "../lib/emails";
import { ensureReceipt, resolveCourseName, type PaymentDocument } from "./documents.service";
import { reverseCashPaymentIncome, recordCashPaymentIncome } from "./cash.service";
import { getInvoicingSettings, getPricingRates } from "./settings.service";
import { issueInvoice } from "./invoice.service";
import { syncAccessRestriction } from "./payments.service";

/** Estados en los que una cuota admite cobro. */
export const COLLECTABLE_STATUSES = ["pending", "overdue", "suspended"] as const;

export type CollectFailure =
  | { ok: false; code: "not_found" | "not_collectable" | "amount_mismatch" | "duplicate_receipt" | "invalid"; message: string; quote?: PriceQuote };

export interface CollectSuccess {
  ok: true;
  payment: typeof payments.$inferSelect;
  quote: PriceQuote;
  receipt: PaymentDocument;
  emailIds: string[];
  studentId: string;
}

export interface CollectInput {
  paymentId: string;
  method: PaymentMethodKey;
  actor: Actor;
  provider: "manual" | "mercadopago";
  /** Importe que la pantalla mostró (en centavos). El servidor lo compara con el que calcula él. */
  expectedFinalCents?: number;
  /** Cotización congelada al iniciar un pago electrónico: se respeta aunque ya haya vencido el descuento. */
  lockedQuote?: PriceQuote;
  receiptNumber?: string;
  externalReference?: string;
  providerPaymentId?: string;
  observations?: string;
  internalReference?: string;
}

export function newInternalReference(): string {
  const d = todayInstitute().replace(/-/g, "");
  return `SL-${d}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Precios de una fila de pago, en el formato que entiende el motor de precios. */
export function pricesOf(p: {
  amount: string;
  transferPrice: string | null;
  cashPrice: string | null;
  discountValidUntil: string | null;
  dueDate: string;
}): FeePrices {
  return {
    listPrice: p.amount,
    transferPrice: p.transferPrice,
    cashPrice: p.cashPrice,
    discountValidUntil: p.discountValidUntil ?? defaultDiscountValidUntil(p.dueDate),
  };
}

/**
 * Confirma el cobro de una cuota (manual o electrónico) en UNA transacción: recalcula el importe
 * en el servidor, marca la cuota, ingresa a caja si fue en efectivo, genera el comprobante y deja
 * encolado el correo al alumno. Si algo falla, no queda nada a medias.
 */
export async function collectPayment(input: CollectInput): Promise<CollectSuccess | CollectFailure> {
  try {
    return await dbTx.transaction(async (tx) => {
      const [current] = await tx.select().from(payments).where(eq(payments.id, input.paymentId)).for("update").limit(1);
      if (!current) return { ok: false, code: "not_found", message: "El pago no existe" } as const;
      if (!(COLLECTABLE_STATUSES as readonly string[]).includes(current.status)) {
        return {
          ok: false,
          code: "not_collectable",
          message:
            current.status === "paid"
              ? "Esta cuota ya fue cobrada"
              : "Solo se pueden cobrar cuotas pendientes, vencidas o suspendidas. Esta cuota está anulada.",
        } as const;
      }

      const rates = await getPricingRates(tx);
      const quote = input.lockedQuote ?? quotePayment(pricesOf(current), input.method, todayInstitute(), rates);
      if (input.expectedFinalCents !== undefined && input.expectedFinalCents !== quote.finalCents) {
        return {
          ok: false,
          code: "amount_mismatch",
          message: `El importe cambió: ahora corresponde ${fromCents(quote.finalCents)}. Revisá el detalle y confirmá de nuevo.`,
          quote,
        } as const;
      }

      const cols = quoteToColumns(quote);
      const now = new Date();
      const [paid] = await tx
        .update(payments)
        .set({
          status: "paid",
          paidAt: now,
          method: input.method,
          amount: cols.finalAmount,
          ...cols,
          provider: input.provider,
          providerPaymentId: input.providerPaymentId ?? null,
          externalReference: input.externalReference?.trim() || null,
          internalReference: current.internalReference ?? input.internalReference ?? newInternalReference(),
          receiptNumber: input.receiptNumber?.trim() || current.receiptNumber,
          registeredBy: input.provider === "manual" ? input.actor.id : null,
          notes: input.observations?.trim()
            ? [current.notes, input.observations.trim()].filter(Boolean).join("\n")
            : current.notes,
          updatedAt: now,
        })
        .where(and(eq(payments.id, current.id), inArray(payments.status, [...COLLECTABLE_STATUSES])))
        .returning();
      if (!paid) return { ok: false, code: "not_collectable", message: "Esta cuota ya fue cobrada" } as const;

      if (input.method === "cash") {
        await recordCashPaymentIncome(tx, {
          paymentId: paid.id,
          amountCents: quote.finalCents,
          reason: `Cobro de cuota ${paid.period ?? paid.dueDate}`,
          actor: input.actor,
        });
      }

      const receipt = await ensureReceipt(tx, { paymentId: paid.id, amount: cols.finalAmount });
      const emailIds = await enqueueReceiptEmail(tx, paid, receipt);
      await recordAudit(tx, input.actor, {
        action: input.provider === "manual" ? "payment.collected" : "payment.confirmed_online",
        entityType: "payment",
        entityId: paid.id,
        before: { status: current.status, amount: current.amount },
        after: { status: "paid", method: input.method, ...cols },
      });

      return { ok: true, payment: paid, quote, receipt, emailIds, studentId: paid.studentId } as const;
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, code: "duplicate_receipt", message: "Ya existe un pago con ese número de recibo" };
    }
    throw e;
  }
}

async function enqueueReceiptEmail(tx: DbExecutor, paid: typeof payments.$inferSelect, receipt: PaymentDocument): Promise<string[]> {
  const [student] = await tx
    .select({ name: profiles.fullName, email: profiles.email })
    .from(students)
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(students.id, paid.studentId))
    .limit(1);
  if (!student?.email) return [];
  const courseName = await resolveCourseName(paid.courseId, paid.studentId);
  return enqueueEmails(tx, [
    {
      eventType: "payment_receipt",
      recipient: student.email,
      recipientName: student.name,
      subject: `Comprobante de pago — ${paid.period ?? paid.dueDate}`,
      html: receiptEmail({
        studentName: student.name,
        courseName,
        period: paid.period,
        method: paid.method!,
        paidAt: paid.paidAt!,
        listPrice: paid.listPriceSnapshot!,
        discountAmount: paid.discountAmount ?? "0.00",
        surchargeAmount: paid.surchargeAmount ?? "0.00",
        finalAmount: paid.finalAmount!,
        receiptNumber: receipt.documentNumber ?? "",
        receiptUrl: `${publicBaseUrl()}/comprobante/${receipt.accessToken}`,
      }),
      relatedEntityType: "payment",
      relatedEntityId: paid.id,
      dedupeKey: `payment_receipt:${paid.id}`,
    },
  ]);
}

/**
 * Pasos posteriores a la confirmación, fuera de la transacción y tolerantes a fallos: recalcular
 * la restricción de acceso y enviar los correos encolados. Un error acá nunca deshace el cobro.
 */
export async function afterPaymentConfirmed(result: CollectSuccess): Promise<{ restrictionLifted: boolean }> {
  let restrictionLifted = false;
  try {
    const sync = await syncAccessRestriction(result.studentId);
    restrictionLifted = sync?.lifted ?? false;
  } catch (e) {
    console.error("[pagos] no se pudo recalcular la restricción de acceso:", e instanceof Error ? e.message : e);
  }
  await deliverEmails(result.emailIds);
  // Todo pago electrónico confirmado activa la facturación; el efectivo, sólo si la dirección lo configuró.
  // Un fallo fiscal nunca deshace el cobro: la factura queda pendiente/fallida y se reintenta.
  try {
    const { autoInvoiceCash } = await getInvoicingSettings();
    if (result.payment.method !== "cash" || autoInvoiceCash) await issueInvoice(result.payment.id);
  } catch (e) {
    console.error("[pagos] no se pudo facturar el pago:", e instanceof Error ? e.message : e);
  }
  return { restrictionLifted };
}

/**
 * Anula un pago. Si estaba cobrado en efectivo, además revierte su ingreso a la caja con un
 * movimiento compensatorio, en la misma transacción.
 */
export async function cancelPaymentWithCash(p: { paymentId: string; reason: string; actor: Actor }) {
  return dbTx.transaction(async (tx) => {
    const [current] = await tx.select().from(payments).where(eq(payments.id, p.paymentId)).for("update").limit(1);
    if (!current || current.status === "cancelled") return null;
    const now = new Date();
    const [cancelled] = await tx
      .update(payments)
      .set({ status: "cancelled", cancelledAt: now, cancelledBy: p.actor.id, cancellationReason: p.reason, updatedAt: now })
      .where(eq(payments.id, p.paymentId))
      .returning();
    let cashReversed = false;
    if (current.status === "paid" && current.method === "cash") {
      cashReversed = (await reverseCashPaymentIncome(tx, { paymentId: p.paymentId, reason: `Anulación de pago: ${p.reason}`, actor: p.actor })) !== null;
    }
    await recordAudit(tx, p.actor, {
      action: "payment.cancelled",
      entityType: "payment",
      entityId: p.paymentId,
      before: { status: current.status, amount: current.amount, method: current.method },
      after: { status: "cancelled" },
      note: p.reason,
    });
    return { payment: cancelled, cashReversed };
  });
}
