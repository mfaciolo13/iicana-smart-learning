import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db, dbTx } from "@/lib/drizzle";
import { paymentOperations, paymentProviderEvents, payments, profiles, students } from "@/lib/drizzle/schema";
import { recordAudit, SYSTEM_ACTOR, type DbExecutor } from "@/lib/audit";
import { deliverEmails, enqueueEmails } from "@/lib/outbox";
import { emailShell, esc } from "@/lib/email-layout";
import { percentOf, toCents } from "@/lib/money";
import { todayInstitute } from "@/lib/validation";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  MercadoPagoError,
  createPreference,
  getPayment,
  isMercadoPagoConfigured,
  mercadoPagoEnv,
  searchPaymentsByReference,
  type MpPayment,
} from "@/lib/mercadopago";
import { quotePayment, quoteToColumns, type PriceQuote } from "../lib/pricing";
import { buildPreference, operationExpiry } from "../lib/mp-preference";
import { periodLabel } from "../lib/period-label";
import { publicBaseUrl } from "../lib/emails";
import { COLLECTABLE_STATUSES, afterPaymentConfirmed, cancelPaymentWithCash, collectPayment, newInternalReference, pricesOf } from "./collect.service";
import { getDirectorRecipients } from "./cash.service";
import { getPricingRates } from "./settings.service";
import { syncAccessRestriction } from "./payments.service";

export type PaymentOperation = typeof paymentOperations.$inferSelect;
export type OnlineMethod = "transfer" | "card";

/** Una operación viva (iniciada y todavía no resuelta ni vencida) bloquea iniciar otra sobre la misma cuota. */
const ACTIVE = ["created", "pending"] as const;

/** Cotización congelada al iniciar la operación. */
export function quoteFromOperation(op: PaymentOperation): PriceQuote {
  const listCents = toCents(op.listPriceSnapshot);
  const discountCents = toCents(op.discountAmount);
  const surchargeCents = toCents(op.surchargeAmount);
  return {
    method: op.method as OnlineMethod,
    discountsActive: discountCents > 0,
    kind: surchargeCents > 0 ? "card_surcharge" : discountCents > 0 ? (op.method === "transfer" ? "transfer_discount" : "cash_discount") : "list",
    listCents,
    discountCents,
    discountPct: Number(op.discountPercentage),
    surchargeCents,
    surchargePct: percentOf(surchargeCents, listCents),
    finalCents: toCents(op.finalAmount),
  };
}

// ─── Consultas ──────────────────────────────────────────────────────────────

/** Pasa a "vencida" toda operación viva cuyo plazo terminó. */
export async function expireStaleOperations(exec: DbExecutor = db): Promise<number> {
  const rows = await exec
    .update(paymentOperations)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(inArray(paymentOperations.status, [...ACTIVE]), lt(paymentOperations.expiresAt, new Date())))
    .returning({ id: paymentOperations.id });
  return rows.length;
}

export async function listOperationsForPayment(paymentId: string): Promise<PaymentOperation[]> {
  return db.select().from(paymentOperations).where(eq(paymentOperations.paymentId, paymentId)).orderBy(desc(paymentOperations.createdAt));
}

/** Operaciones vivas de un alumno, por cuota: alimenta el estado "en proceso". */
export async function getActiveOperationsByPayment(studentId: string): Promise<Map<string, PaymentOperation>> {
  await expireStaleOperations();
  const rows = await db
    .select()
    .from(paymentOperations)
    .where(and(eq(paymentOperations.studentId, studentId), inArray(paymentOperations.status, [...ACTIVE])));
  return new Map(rows.map((r) => [r.paymentId, r]));
}

// ─── Inicio del pago ────────────────────────────────────────────────────────

export type StartCheckoutResult = { ok: true; url: string; reused: boolean } | { ok: false; message: string };

/**
 * Inicia un pago online de una cuota del alumno. El importe se calcula en el servidor con la fecha
 * del instituto y queda congelado en la operación; la preferencia de Mercado Pago vence cuando
 * termina el descuento, de modo que una operación iniciada el día 10 no sirve el día 11.
 */
export async function startCheckout(input: { paymentId: string; method: OnlineMethod; studentId: string }): Promise<StartCheckoutResult> {
  if (!isMercadoPagoConfigured()) {
    return { ok: false, message: "El pago online todavía no está habilitado. Podés pagar en la academia." };
  }

  const [row] = await db
    .select({ payment: payments, email: profiles.email, name: profiles.fullName })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(payments.id, input.paymentId))
    .limit(1);
  // Una cuota ajena responde igual que una inexistente: no se revela que existe.
  if (!row || row.payment.studentId !== input.studentId) return { ok: false, message: "No encontramos esa cuota." };
  const payment = row.payment;
  if (!(COLLECTABLE_STATUSES as readonly string[]).includes(payment.status)) {
    return { ok: false, message: payment.status === "paid" ? "Esta cuota ya está paga." : "Esta cuota no se puede pagar." };
  }

  await expireStaleOperations();
  const [active] = await db
    .select()
    .from(paymentOperations)
    .where(and(eq(paymentOperations.paymentId, payment.id), inArray(paymentOperations.status, [...ACTIVE])))
    .limit(1);
  if (active && active.method === input.method && active.initPoint) {
    return { ok: true, url: active.initPoint, reused: true };
  }

  const rates = await getPricingRates();
  const now = new Date();
  const today = todayInstitute();
  const prices = pricesOf(payment);
  const quote = quotePayment(prices, input.method, today, rates);
  const expiresAt = operationExpiry({
    now,
    today,
    quote,
    discountDeadline: prices.discountValidUntil ?? today,
  });
  const cols = quoteToColumns(quote);
  const internalReference = newInternalReference();

  let op: PaymentOperation;
  try {
    op = await dbTx.transaction(async (tx) => {
      // Cambiar de medio cancela la operación anterior; el índice único impide tener dos vivas.
      if (active) {
        await tx.update(paymentOperations).set({ status: "cancelled", updatedAt: now }).where(eq(paymentOperations.id, active.id));
      }
      const [created] = await tx
        .insert(paymentOperations)
        .values({
          paymentId: payment.id,
          studentId: payment.studentId,
          method: input.method,
          status: "created",
          listPriceSnapshot: cols.listPriceSnapshot,
          discountAmount: cols.discountAmount,
          discountPercentage: cols.discountPercentage,
          surchargeAmount: cols.surchargeAmount,
          finalAmount: cols.finalAmount,
          internalReference,
          expiresAt,
          createdBy: payment.studentId,
        })
        .returning();
      return created;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, message: "Ya hay un pago en curso para esta cuota. Esperá unos instantes o actualizá el estado." };
    throw e;
  }

  const baseUrl = publicBaseUrl();
  try {
    const preference = await createPreference(
      buildPreference({
        internalReference,
        title: `Cuota ${periodLabel(payment.period)} — Smart Learning`,
        quote,
        method: input.method,
        payer: { email: row.email, name: row.name },
        baseUrl,
        now,
        expiresAt,
        includeNotificationUrl: !/localhost|127\.0\.0\.1/.test(baseUrl),
      }),
      op.id,
    );
    const url = mercadoPagoEnv() === "sandbox" ? (preference.sandbox_init_point ?? preference.init_point) : preference.init_point;
    await db
      .update(paymentOperations)
      .set({ status: "pending", providerPreferenceId: preference.id, initPoint: url, updatedAt: new Date() })
      .where(eq(paymentOperations.id, op.id));
    return { ok: true, url, reused: false };
  } catch (e) {
    await db
      .update(paymentOperations)
      .set({ status: "failed", providerStatusDetail: e instanceof MercadoPagoError ? e.message : "error_inesperado", updatedAt: new Date() })
      .where(eq(paymentOperations.id, op.id));
    return { ok: false, message: "No pudimos iniciar el pago con Mercado Pago. Intentá de nuevo en unos minutos." };
  }
}

// ─── Procesamiento de pagos del proveedor ───────────────────────────────────

export type ProcessOutcome =
  | "confirmed"
  | "already_confirmed"
  | "pending"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "duplicate_payment"
  | "amount_mismatch"
  | "unknown_reference"
  | "ignored";

/** Aviso a Dirección (pago duplicado, reembolso, importe distinto). Queda en la cola con reintentos. */
async function alertDirectors(subject: string, bodyHtml: string, dedupeKey: string): Promise<void> {
  const recipients = await getDirectorRecipients();
  const ids = await enqueueEmails(
    db,
    recipients.map((r) => ({
      eventType: "payment_alert",
      recipient: r.email,
      recipientName: r.name,
      subject,
      html: emailShell(bodyHtml),
      relatedEntityType: "payment_operation",
      dedupeKey: `${dedupeKey}:${r.email}`,
    })),
  );
  await deliverEmails(ids);
}

async function markOperation(opId: string, set: Partial<typeof paymentOperations.$inferInsert>) {
  await db
    .update(paymentOperations)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(paymentOperations.id, opId));
}

/**
 * Aplica el estado oficial de un pago de Mercado Pago a nuestra operación. Es idempotente: una
 * notificación repetida no duplica el pago, el comprobante ni el movimiento (la cuota sólo se
 * cobra si sigue adeudada y el índice único del proveedor impide reusar un mismo pago).
 */
export async function applyProviderPayment(mp: MpPayment): Promise<{ outcome: ProcessOutcome; studentId?: string }> {
  if (!mp.external_reference) return { outcome: "ignored" };
  const [op] = await db.select().from(paymentOperations).where(eq(paymentOperations.internalReference, mp.external_reference)).limit(1);
  if (!op) return { outcome: "unknown_reference" };

  const providerFields = {
    providerPaymentId: String(mp.id),
    providerStatus: mp.status,
    providerStatusDetail: mp.status_detail ?? null,
  };

  if (mp.currency_id !== "ARS" || toCents(String(mp.transaction_amount)) !== toCents(op.finalAmount)) {
    await markOperation(op.id, { ...providerFields, status: "failed" });
    await recordAudit(db, SYSTEM_ACTOR, {
      action: "payment.provider_mismatch",
      entityType: "payment_operation",
      entityId: op.id,
      after: { esperado: op.finalAmount, recibido: mp.transaction_amount, moneda: mp.currency_id, mpId: mp.id },
    });
    await alertDirectors(
      "Pago online con importe distinto al esperado",
      `<p style="color:#1e293b;font-size:15px;">Mercado Pago informó el pago <strong>${esc(mp.id)}</strong> por ${esc(mp.transaction_amount)} ${esc(mp.currency_id)}, pero la operación <strong>${esc(op.internalReference)}</strong> esperaba ${esc(op.finalAmount)} ARS. No se confirmó la cuota: revisalo en Mercado Pago.</p>`,
      `mp_mismatch:${op.id}:${mp.id}`,
    );
    return { outcome: "amount_mismatch", studentId: op.studentId };
  }

  switch (mp.status) {
    case "approved":
      return confirmApproved(op, mp, providerFields);
    case "pending":
    case "in_process":
    case "in_mediation":
    case "authorized":
      if (op.status !== "approved") await markOperation(op.id, { ...providerFields, status: "pending" });
      return { outcome: "pending", studentId: op.studentId };
    case "rejected":
      if (op.status !== "approved") await markOperation(op.id, { ...providerFields, status: "rejected" });
      return { outcome: "rejected", studentId: op.studentId };
    case "cancelled":
      if (op.status !== "approved") await markOperation(op.id, { ...providerFields, status: "cancelled" });
      return { outcome: "cancelled", studentId: op.studentId };
    case "refunded":
    case "charged_back":
      return handleRefund(op, mp, providerFields);
    default:
      return { outcome: "ignored", studentId: op.studentId };
  }
}

async function confirmApproved(op: PaymentOperation, mp: MpPayment, providerFields: Record<string, string | null>) {
  if (op.status === "approved") return { outcome: "already_confirmed" as const, studentId: op.studentId };

  const result = await collectPayment({
    paymentId: op.paymentId,
    method: op.method as OnlineMethod,
    actor: SYSTEM_ACTOR,
    provider: "mercadopago",
    providerPaymentId: String(mp.id),
    lockedQuote: quoteFromOperation(op),
    internalReference: op.internalReference,
    // La operación se cierra en el mismo commit que la cuota: no puede quedar uno sin el otro.
    inTransaction: async (tx) => {
      await tx
        .update(paymentOperations)
        .set({ ...providerFields, status: "approved", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(paymentOperations.id, op.id));
    },
  });

  if (result.ok) {
    await afterPaymentConfirmed(result);
    return { outcome: "confirmed" as const, studentId: op.studentId };
  }

  if (result.code === "not_collectable") {
    // Entró plata por Mercado Pago pero la cuota ya estaba cobrada (o anulada) por otra vía.
    await markOperation(op.id, { ...providerFields, status: "duplicate" });
    await recordAudit(db, SYSTEM_ACTOR, {
      action: "payment.provider_duplicate",
      entityType: "payment_operation",
      entityId: op.id,
      after: { paymentId: op.paymentId, mpId: mp.id, monto: op.finalAmount },
    });
    await alertDirectors(
      "Pago duplicado en Mercado Pago: corresponde reembolsar",
      `<p style="color:#1e293b;font-size:15px;">Mercado Pago acreditó el pago <strong>${esc(mp.id)}</strong> por ${esc(op.finalAmount)} ARS (operación ${esc(op.internalReference)}), pero esa cuota ya figuraba cobrada o anulada. No se registró un segundo cobro. Reembolsá el pago desde el panel de Mercado Pago.</p>`,
      `mp_duplicate:${op.id}:${mp.id}`,
    );
    return { outcome: "duplicate_payment" as const, studentId: op.studentId };
  }
  throw new Error(`No se pudo confirmar el pago (${result.code})`);
}

async function handleRefund(op: PaymentOperation, mp: MpPayment, providerFields: Record<string, string | null>) {
  if (op.status === "refunded") return { outcome: "refunded" as const, studentId: op.studentId };
  await markOperation(op.id, { ...providerFields, status: "refunded" });
  // Si la cuota se había cobrado por esta operación, se anula con un rastro claro (y se revierte su efecto en la restricción).
  const [payment] = await db.select().from(payments).where(eq(payments.id, op.paymentId)).limit(1);
  if (payment && payment.status === "paid" && payment.providerPaymentId === String(mp.id)) {
    await cancelPaymentWithCash({
      paymentId: payment.id,
      reason: `Reembolsado en Mercado Pago (pago ${mp.id}, ${mp.status})`,
      actor: SYSTEM_ACTOR,
    });
    await syncAccessRestriction(payment.studentId);
  }
  await recordAudit(db, SYSTEM_ACTOR, {
    action: "payment.provider_refund",
    entityType: "payment_operation",
    entityId: op.id,
    after: { mpId: mp.id, estado: mp.status },
  });
  await alertDirectors(
    "Pago reembolsado en Mercado Pago",
    `<p style="color:#1e293b;font-size:15px;">El pago <strong>${esc(mp.id)}</strong> (operación ${esc(op.internalReference)}) figura como <strong>${esc(mp.status)}</strong>. La cuota quedó anulada con ese motivo.</p>`,
    `mp_refund:${op.id}:${mp.id}`,
  );
  return { outcome: "refunded" as const, studentId: op.studentId };
}

// ─── Notificaciones ─────────────────────────────────────────────────────────

/**
 * Procesa una notificación de pago: consulta el estado oficial en Mercado Pago (nunca confía en el
 * cuerpo de la notificación) y deja registro del evento. Si ya se procesó, no hace nada.
 */
export async function handlePaymentNotification(mpPaymentId: string): Promise<{ outcome: ProcessOutcome | "duplicate_event"; studentId?: string }> {
  const mp = await getPayment(mpPaymentId);
  const eventKey = `payment:${mp.id}:${mp.status}:${mp.date_last_updated ?? ""}`;

  const [existing] = await db.select().from(paymentProviderEvents).where(eq(paymentProviderEvents.eventKey, eventKey)).limit(1);
  if (existing?.processedAt && !existing.errorMessage) return { outcome: "duplicate_event" };

  if (!existing) {
    await db
      .insert(paymentProviderEvents)
      .values({ eventKey, topic: "payment", resourceId: String(mp.id), payload: { status: mp.status, detail: mp.status_detail, amount: mp.transaction_amount, ref: mp.external_reference } })
      .onConflictDoNothing({ target: paymentProviderEvents.eventKey });
  }

  try {
    const result = await applyProviderPayment(mp);
    await db
      .update(paymentProviderEvents)
      .set({ outcome: result.outcome, processedAt: new Date(), errorMessage: null })
      .where(eq(paymentProviderEvents.eventKey, eventKey));
    return result;
  } catch (e) {
    await db
      .update(paymentProviderEvents)
      .set({ errorMessage: e instanceof Error ? e.message.slice(0, 300) : "error", processedAt: new Date() })
      .where(eq(paymentProviderEvents.eventKey, eventKey));
    throw e;
  }
}

/** Consulta a Mercado Pago los pagos de una operación y los aplica (botón "Actualizar estado", cron). */
export async function reconcileOperation(op: PaymentOperation): Promise<ProcessOutcome | "none"> {
  const found = await searchPaymentsByReference(op.internalReference);
  if (found.length === 0) return "none";
  // Del más viejo al más nuevo, para que el último estado oficial sea el que quede.
  let last: ProcessOutcome = "ignored";
  for (const mp of [...found].reverse()) {
    last = (await applyProviderPayment(mp)).outcome;
  }
  return last;
}

/** Reconcilia las operaciones vivas de un alumno (lo dispara él mismo al volver de Mercado Pago). */
export async function reconcileStudentOperations(studentId: string): Promise<number> {
  if (!isMercadoPagoConfigured()) return 0;
  const ops = await db
    .select()
    .from(paymentOperations)
    .where(and(eq(paymentOperations.studentId, studentId), inArray(paymentOperations.status, [...ACTIVE])));
  let touched = 0;
  for (const op of ops) {
    try {
      if ((await reconcileOperation(op)) !== "none") touched++;
    } catch (e) {
      console.error("[mp] no se pudo reconciliar la operación", op.id, e instanceof Error ? e.message : e);
    }
  }
  await expireStaleOperations();
  return touched;
}

/** Cron: reconcilia todas las operaciones vivas y luego vence las que ya pasaron su plazo. */
export async function reconcileAllOperations(): Promise<{ reconciled: number; expired: number }> {
  let reconciled = 0;
  if (isMercadoPagoConfigured()) {
    const ops = await db
      .select()
      .from(paymentOperations)
      .where(inArray(paymentOperations.status, [...ACTIVE]))
      .limit(100);
    for (const op of ops) {
      try {
        if ((await reconcileOperation(op)) !== "none") reconciled++;
      } catch (e) {
        console.error("[mp] no se pudo reconciliar la operación", op.id, e instanceof Error ? e.message : e);
      }
    }
  }
  const expired = await expireStaleOperations();
  return { reconciled, expired };
}
