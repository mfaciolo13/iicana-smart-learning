import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db, dbTx } from "@/lib/drizzle";
import { arcaAccessTickets, paymentDocuments, payments, profiles, students } from "@/lib/drizzle/schema";
import { SYSTEM_ACTOR, recordAudit, type Actor, type DbExecutor } from "@/lib/audit";
import { deliverEmails, enqueueEmails } from "@/lib/outbox";
import { toCents } from "@/lib/money";
import { todayInstitute } from "@/lib/validation";
import {
  ArcaError,
  DOC_TIPO_DNI,
  buildQrUrl,
  fetchLastAuthorized,
  fetchVoucher,
  formatVoucherNumber,
  getArcaConfig,
  loginWsaa,
  requestCae,
  type AccessTicket,
  type ArcaConfig,
} from "@/lib/arca";
import { publicBaseUrl, invoiceEmail } from "../lib/emails";
import { newAccessToken } from "./documents.service";

/** Serializa la emisión para que dos facturas no pidan el mismo número a ARCA. */
const INVOICE_LOCK_KEY = 8_001_001;
/** Tras esta cantidad de intentos automáticos la factura queda "fallida" hasta un reintento manual. */
export const MAX_AUTOMATIC_INVOICE_ATTEMPTS = 5;

export type InvoiceStatus = "issued" | "failed" | "skipped";
export interface InvoiceOutcome {
  status: InvoiceStatus;
  message?: string;
  documentId?: string;
}

/** Datos fiscales que quedan impresos en la factura aunque después cambie la configuración. */
export interface InvoiceSnapshot {
  env: string;
  issuer: ArcaConfig["issuer"] & { cuit: string };
  receptor: { name: string; docTipo: number; docNro: string; condicionIva: string };
  concept: string;
  date: string;
  qrUrl: string;
  observations: string[];
}

const lastDayOfMonth = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return `${period}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};

async function getAccessTicket(exec: DbExecutor, config: ArcaConfig): Promise<AccessTicket> {
  const valid = async (margin: number) => {
    const [row] = await exec
      .select()
      .from(arcaAccessTickets)
      .where(
        and(
          eq(arcaAccessTickets.service, "wsfe"),
          eq(arcaAccessTickets.environment, config.env),
          sql`${arcaAccessTickets.expiresAt} > now() + make_interval(mins => ${margin})`,
        ),
      )
      .limit(1);
    return row ? { token: row.token, sign: row.sign, expiresAt: row.expiresAt } : null;
  };

  const cached = await valid(5);
  if (cached) return cached;
  try {
    const ticket = await loginWsaa(config);
    await exec
      .insert(arcaAccessTickets)
      .values({ service: "wsfe", environment: config.env, token: ticket.token, sign: ticket.sign, expiresAt: ticket.expiresAt })
      .onConflictDoUpdate({
        target: [arcaAccessTickets.service, arcaAccessTickets.environment],
        set: { token: ticket.token, sign: ticket.sign, expiresAt: ticket.expiresAt, createdAt: new Date() },
      });
    return ticket;
  } catch (e) {
    // Otra instancia pidió el ticket un instante antes: WSAA no entrega otro mientras haya uno vigente.
    const fallback = await valid(0);
    if (fallback) return fallback;
    throw e;
  }
}

/**
 * Emite la Factura C de un pago confirmado. Es idempotente: hay una sola fila por pago
 * (índice único), una factura ya emitida se devuelve tal cual, y el número de comprobante se
 * reserva en la fila ANTES de llamar a ARCA para que, si el proceso se corta después de que ARCA
 * la autorizó, el reintento la reconozca (FECompConsultar) en lugar de emitir una segunda.
 */
export async function issueInvoice(paymentId: string, actor: Actor = SYSTEM_ACTOR): Promise<InvoiceOutcome> {
  const config = getArcaConfig();
  if (!config) return { status: "skipped", message: "La facturación electrónica no está configurada (faltan los datos de ARCA)." };

  const [row] = await db
    .select({
      payment: payments,
      studentName: profiles.fullName,
      studentEmail: profiles.email,
      dni: students.dni,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .innerJoin(profiles, eq(students.profileId, profiles.id))
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!row) return { status: "skipped", message: "El pago no existe." };
  const { payment } = row;
  // Una factura definitiva sólo se emite sobre un pago efectivamente confirmado.
  if (payment.status !== "paid" || !payment.finalAmount) {
    return { status: "skipped", message: "Solo se factura un pago confirmado." };
  }

  await db
    .insert(paymentDocuments)
    .values({
      paymentId,
      documentType: "invoice_c",
      fiscalStatus: "pending",
      amount: payment.finalAmount,
      accessToken: newAccessToken(),
    })
    .onConflictDoNothing();

  const outcome = await dbTx.transaction(async (tx): Promise<InvoiceOutcome> => {
    await tx.execute(sql`select pg_advisory_xact_lock(${INVOICE_LOCK_KEY})`);
    const [doc] = await tx
      .select()
      .from(paymentDocuments)
      .where(and(eq(paymentDocuments.paymentId, paymentId), eq(paymentDocuments.documentType, "invoice_c")))
      .for("update")
      .limit(1);
    if (doc.fiscalStatus === "issued") return { status: "issued", documentId: doc.id };

    // El intento se registra por una conexión aparte: queda aunque esta transacción se deshaga.
    await db
      .update(paymentDocuments)
      .set({ attemptCount: sql`${paymentDocuments.attemptCount} + 1`, lastAttemptAt: new Date(), updatedAt: new Date() })
      .where(eq(paymentDocuments.id, doc.id));

    const fail = async (message: string): Promise<InvoiceOutcome> => {
      await db
        .update(paymentDocuments)
        .set({ fiscalStatus: "failed", errorMessage: message.slice(0, 500), updatedAt: new Date() })
        .where(eq(paymentDocuments.id, doc.id));
      return { status: "failed", message, documentId: doc.id };
    };

    try {
      const ticket = await getAccessTicket(db, config);
      const totalCents = toCents(payment.finalAmount!);
      const today = todayInstitute();
      const period = payment.period ?? payment.dueDate.slice(0, 7);

      let number = doc.voucherNumber;
      let cae: string | null = null;
      let caeExpiration: string | null = null;
      let observations: string[] = [];

      if (number) {
        // Un intento anterior ya reservó este número: tal vez ARCA sí lo autorizó.
        const existing = await fetchVoucher(config, ticket, number);
        if (existing && existing.totalCents === totalCents && existing.docNro === row.dni) {
          cae = existing.cae;
          caeExpiration = existing.caeExpiration;
        }
      } else {
        number = (await fetchLastAuthorized(config, ticket)) + 1;
        await db
          .update(paymentDocuments)
          .set({ voucherNumber: number, posNumber: config.ptoVta, updatedAt: new Date() })
          .where(eq(paymentDocuments.id, doc.id));
      }

      if (!cae) {
        const { result } = await requestCae(config, ticket, {
          cuit: config.cuit,
          ptoVta: config.ptoVta,
          date: today,
          number,
          totalCents,
          docTipo: DOC_TIPO_DNI,
          docNro: row.dni,
          serviceFrom: `${period}-01`,
          serviceTo: lastDayOfMonth(period),
          dueDate: payment.dueDate,
        });
        observations = [...result.observations];
        if (!result.approved || !result.cae) {
          const reason = [...result.errors, ...result.observations].join(" · ") || "ARCA rechazó el comprobante";
          return fail(reason);
        }
        cae = result.cae;
        caeExpiration = result.caeExpiration;
      }

      const snapshot: InvoiceSnapshot = {
        env: config.env,
        issuer: { ...config.issuer, cuit: config.cuit },
        receptor: { name: row.studentName, docTipo: DOC_TIPO_DNI, docNro: row.dni, condicionIva: "Consumidor Final" },
        concept: `Cuota ${period}`,
        date: today,
        qrUrl: buildQrUrl({ date: today, cuit: config.cuit, ptoVta: config.ptoVta, number, totalCents, docTipo: DOC_TIPO_DNI, docNro: row.dni, cae }),
        observations,
      };
      await tx
        .update(paymentDocuments)
        .set({
          fiscalStatus: "issued",
          documentNumber: formatVoucherNumber(config.ptoVta, number),
          voucherNumber: number,
          posNumber: config.ptoVta,
          cae,
          caeExpiration,
          issuedAt: new Date(),
          errorMessage: null,
          providerResponse: snapshot as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(paymentDocuments.id, doc.id));
      await recordAudit(tx, actor, {
        action: "invoice.issued",
        entityType: "payment",
        entityId: paymentId,
        after: { numero: formatVoucherNumber(config.ptoVta, number), cae, importe: payment.finalAmount },
      });
      return { status: "issued", documentId: doc.id };
    } catch (e) {
      const message = e instanceof ArcaError ? e.message : "Error inesperado al emitir la factura";
      if (!(e instanceof ArcaError)) console.error("[factura]", e instanceof Error ? e.message : e);
      return fail(message);
    }
  });

  if (outcome.status === "issued") await sendInvoiceEmail(row.studentEmail, row.studentName, payment, outcome.documentId!);
  return outcome;
}

/** Correo con el enlace a la factura. Se encola una sola vez por pago y se reintenta si falla. */
async function sendInvoiceEmail(email: string | null, name: string, payment: typeof payments.$inferSelect, documentId: string) {
  if (!email) return;
  const docs = await db.select().from(paymentDocuments).where(eq(paymentDocuments.paymentId, payment.id));
  const invoice = docs.find((d) => d.id === documentId);
  const receipt = docs.find((d) => d.documentType === "receipt");
  if (!invoice || !receipt) return;
  const base = publicBaseUrl();
  const ids = await enqueueEmails(db, [
    {
      eventType: "payment_invoice",
      recipient: email,
      recipientName: name,
      subject: `Factura C ${invoice.documentNumber} — ${payment.period ?? payment.dueDate}`,
      html: invoiceEmail({
        studentName: name,
        period: payment.period,
        amount: invoice.amount,
        invoiceNumber: invoice.documentNumber ?? "",
        invoiceUrl: `${base}/comprobante/${invoice.accessToken}`,
        receiptUrl: `${base}/comprobante/${receipt.accessToken}`,
      }),
      relatedEntityType: "payment",
      relatedEntityId: payment.id,
      dedupeKey: `payment_invoice:${payment.id}`,
    },
  ]);
  await deliverEmails(ids);
}

/** Reintento controlado de facturas pendientes o fallidas (cron). No toca las ya emitidas. */
export async function retryFailedInvoices(limit = 20): Promise<{ attempted: number; issued: number }> {
  if (!getArcaConfig()) return { attempted: 0, issued: 0 };
  const docs = await db
    .select({ paymentId: paymentDocuments.paymentId })
    .from(paymentDocuments)
    .where(
      and(
        eq(paymentDocuments.documentType, "invoice_c"),
        inArray(paymentDocuments.fiscalStatus, ["pending", "failed"]),
        lt(paymentDocuments.attemptCount, MAX_AUTOMATIC_INVOICE_ATTEMPTS),
      ),
    )
    .limit(limit);
  let issued = 0;
  for (const d of docs) {
    const r = await issueInvoice(d.paymentId);
    if (r.status === "issued") issued++;
  }
  return { attempted: docs.length, issued };
}
