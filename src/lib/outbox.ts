import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { emailOutbox } from "@/lib/drizzle/schema";
import { sendRawEmail } from "@/lib/email";
import type { DbExecutor } from "@/lib/audit";

/** Tope de intentos automáticos por correo; pasado eso queda "fallido" hasta un reintento manual. */
export const MAX_AUTOMATIC_ATTEMPTS = 8;

export interface OutboxEmail {
  eventType: string;
  recipient: string;
  recipientName?: string | null;
  subject: string;
  html: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** Clave de idempotencia: encolar dos veces la misma clave no duplica el correo. */
  dedupeKey?: string;
}

/**
 * Encola correos. Se llama dentro de la transacción de la operación de negocio: si el pago o el
 * retiro se confirman, el aviso queda guardado aunque el envío falle después.
 */
export async function enqueueEmails(exec: DbExecutor, emails: OutboxEmail[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const rows = await exec
    .insert(emailOutbox)
    .values(
      emails.map((e) => ({
        eventType: e.eventType,
        recipient: e.recipient,
        recipientName: e.recipientName ?? null,
        subject: e.subject,
        html: e.html,
        relatedEntityType: e.relatedEntityType ?? null,
        relatedEntityId: e.relatedEntityId ?? null,
        dedupeKey: e.dedupeKey ?? null,
      })),
    )
    .onConflictDoNothing({ target: emailOutbox.dedupeKey })
    .returning({ id: emailOutbox.id });
  return rows.map((r) => r.id);
}

/** Texto corto y sin datos sensibles para guardar como motivo del fallo. */
function safeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/re_[A-Za-z0-9_]+/g, "[clave]").slice(0, 300);
}

async function deliver(row: typeof emailOutbox.$inferSelect): Promise<boolean> {
  // Se "reserva" el intento antes de enviar: si el proceso muere a mitad de camino, el contador
  // igual refleja que hubo un intento, y dos procesos no mandan el mismo correo a la vez.
  const [claimed] = await db
    .update(emailOutbox)
    .set({ attemptCount: sql`${emailOutbox.attemptCount} + 1`, lastAttemptAt: new Date() })
    .where(and(eq(emailOutbox.id, row.id), eq(emailOutbox.attemptCount, row.attemptCount), inArray(emailOutbox.deliveryStatus, ["pending", "failed"])))
    .returning({ id: emailOutbox.id });
  if (!claimed) return false;

  try {
    await sendRawEmail({ to: row.recipient, subject: row.subject, html: row.html });
    await db.update(emailOutbox).set({ deliveryStatus: "sent", sentAt: new Date(), errorMessage: null }).where(eq(emailOutbox.id, row.id));
    return true;
  } catch (e) {
    await db.update(emailOutbox).set({ deliveryStatus: "failed", errorMessage: safeError(e) }).where(eq(emailOutbox.id, row.id));
    return false;
  }
}

/** Envía los correos indicados (típicamente recién encolados). Nunca lanza. */
export async function deliverEmails(ids: string[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  if (ids.length === 0) return { sent, failed };
  try {
    const rows = await db.select().from(emailOutbox).where(inArray(emailOutbox.id, ids));
    for (const row of rows) {
      if (await deliver(row)) sent++;
      else failed++;
    }
  } catch (e) {
    console.error("[outbox] error al enviar correos:", safeError(e));
  }
  return { sent, failed };
}

/**
 * Reintenta los correos pendientes o fallidos (cron y botón manual). `force` ignora el tope de
 * intentos automáticos, para el reintento que dispara una persona.
 */
export async function retryPendingEmails(opts: { limit?: number; force?: boolean } = {}): Promise<{ sent: number; failed: number }> {
  const limit = opts.limit ?? 50;
  const rows = await db
    .select()
    .from(emailOutbox)
    .where(
      and(
        inArray(emailOutbox.deliveryStatus, ["pending", "failed"]),
        opts.force ? undefined : lt(emailOutbox.attemptCount, MAX_AUTOMATIC_ATTEMPTS),
      ),
    )
    .orderBy(asc(emailOutbox.createdAt))
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    if (await deliver(row)) sent++;
    else failed++;
  }
  return { sent, failed };
}

export async function getOutboxSummary() {
  const [row] = await db
    .select({
      pending: sql<number>`cast(coalesce(sum(case when ${emailOutbox.deliveryStatus} = 'pending' then 1 else 0 end), 0) as int)`,
      failed: sql<number>`cast(coalesce(sum(case when ${emailOutbox.deliveryStatus} = 'failed' then 1 else 0 end), 0) as int)`,
    })
    .from(emailOutbox);
  return row ?? { pending: 0, failed: 0 };
}

export async function listOutbox(limit = 50) {
  return db
    .select({
      id: emailOutbox.id,
      eventType: emailOutbox.eventType,
      recipient: emailOutbox.recipient,
      subject: emailOutbox.subject,
      deliveryStatus: emailOutbox.deliveryStatus,
      attemptCount: emailOutbox.attemptCount,
      lastAttemptAt: emailOutbox.lastAttemptAt,
      sentAt: emailOutbox.sentAt,
      errorMessage: emailOutbox.errorMessage,
      createdAt: emailOutbox.createdAt,
    })
    .from(emailOutbox)
    .orderBy(sql`${emailOutbox.createdAt} desc`)
    .limit(limit);
}
