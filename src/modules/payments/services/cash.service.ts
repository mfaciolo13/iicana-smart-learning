import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, dbTx } from "@/lib/drizzle";
import { cashMovements, cashReconciliations, profiles } from "@/lib/drizzle/schema";
import { recordAudit, type Actor, type DbExecutor } from "@/lib/audit";
import { enqueueEmails } from "@/lib/outbox";
import { fromCents, toCents } from "@/lib/money";
import { withdrawalNoticeEmail } from "../lib/emails";

/** Clave del lock transaccional que serializa los movimientos de caja (saldo antes/después). */
const CASH_LOCK_KEY = 7_001_001;

export type CashMovement = typeof cashMovements.$inferSelect;

export class CashError extends Error {}

/** Saldo derivado del libro: suma de ingresos menos egresos confirmados. Nunca un valor editable. */
export async function getCashBalanceCents(exec: DbExecutor = db): Promise<number> {
  const [row] = await exec
    .select({
      balance: sql<string>`coalesce(sum(case when ${cashMovements.direction} = 'in' then ${cashMovements.amount} else -${cashMovements.amount} end), 0)::text`,
    })
    .from(cashMovements);
  return toCents(row?.balance ?? "0");
}

interface AppendInput {
  movementType: "income" | "withdrawal" | "adjustment";
  direction: "in" | "out";
  sourceType: "payment" | "manual" | "opening" | "reversal" | "adjustment";
  sourceId?: string | null;
  amountCents: number;
  reason: string;
  observations?: string | null;
  reversalOfId?: string | null;
  actor: Actor;
  occurredAt?: Date;
}

/**
 * Agrega un movimiento al libro dentro de una transacción. Toma un lock para que dos operaciones
 * simultáneas no lean el mismo saldo previo, y calcula saldo antes/después en el servidor.
 */
export async function appendCashMovement(tx: DbExecutor, input: AppendInput): Promise<CashMovement> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new CashError("El importe debe ser mayor a 0");
  }
  if (!input.reason.trim()) throw new CashError("El motivo es obligatorio");

  await tx.execute(sql`select pg_advisory_xact_lock(${CASH_LOCK_KEY})`);
  const before = await getCashBalanceCents(tx);
  const after = input.direction === "in" ? before + input.amountCents : before - input.amountCents;
  if (after < 0 && input.sourceType !== "reversal") {
    throw new CashError(`El retiro supera el saldo disponible (${fromCents(before)})`);
  }

  const [row] = await tx
    .insert(cashMovements)
    .values({
      movementType: input.movementType,
      direction: input.direction,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      amount: fromCents(input.amountCents),
      reason: input.reason.trim(),
      observations: input.observations?.trim() || null,
      balanceBefore: fromCents(before),
      balanceAfter: fromCents(after),
      reversalOfId: input.reversalOfId ?? null,
      createdBy: input.actor.id,
      createdByName: input.actor.name,
      ...(input.occurredAt && { occurredAt: input.occurredAt }),
    })
    .returning();
  return row;
}

/** Ingreso de un cobro en efectivo. Idempotente: un mismo pago nunca suma dos veces a la caja. */
export async function recordCashPaymentIncome(
  tx: DbExecutor,
  p: { paymentId: string; amountCents: number; reason: string; actor: Actor },
): Promise<CashMovement | null> {
  await tx.execute(sql`select pg_advisory_xact_lock(${CASH_LOCK_KEY})`);
  const [existing] = await tx
    .select()
    .from(cashMovements)
    .where(and(eq(cashMovements.sourceType, "payment"), eq(cashMovements.sourceId, p.paymentId)))
    .limit(1);
  if (existing) return null;
  return appendCashMovement(tx, {
    movementType: "income",
    direction: "in",
    sourceType: "payment",
    sourceId: p.paymentId,
    amountCents: p.amountCents,
    reason: p.reason,
    actor: p.actor,
  });
}

/**
 * Anula el ingreso de caja de un pago en efectivo con un movimiento compensatorio (el original
 * no se toca). Devuelve null si ese pago no había ingresado a la caja o ya estaba revertido.
 */
export async function reverseCashPaymentIncome(
  tx: DbExecutor,
  p: { paymentId: string; reason: string; actor: Actor },
): Promise<CashMovement | null> {
  await tx.execute(sql`select pg_advisory_xact_lock(${CASH_LOCK_KEY})`);
  const [original] = await tx
    .select()
    .from(cashMovements)
    .where(and(eq(cashMovements.sourceType, "payment"), eq(cashMovements.sourceId, p.paymentId)))
    .limit(1);
  if (!original) return null;
  const [done] = await tx.select({ id: cashMovements.id }).from(cashMovements).where(eq(cashMovements.reversalOfId, original.id)).limit(1);
  if (done) return null;
  return appendCashMovement(tx, {
    movementType: "adjustment",
    direction: "out",
    sourceType: "reversal",
    sourceId: p.paymentId,
    amountCents: toCents(original.amount),
    reason: p.reason,
    reversalOfId: original.id,
    actor: p.actor,
  });
}

/** Ingreso manual de efectivo a la caja (no es el cobro de una cuota). */
export async function registerManualIncome(input: {
  amountCents: number;
  reason: string;
  observations?: string | null;
  occurredAt?: Date;
  actor: Actor;
}): Promise<CashMovement> {
  return dbTx.transaction(async (tx) => {
    const m = await appendCashMovement(tx, { ...input, movementType: "income", direction: "in", sourceType: "manual" });
    await recordAudit(tx, input.actor, { action: "cash.income", entityType: "cash_movement", entityId: m.id, after: m });
    return m;
  });
}

/**
 * Retiro de efectivo. Guarda el movimiento y encola el aviso a Dirección en la misma
 * transacción: si el correo falla después, el retiro no se pierde ni se duplica y el aviso
 * queda pendiente para reintentar.
 */
export async function registerWithdrawal(input: {
  amountCents: number;
  reason: string;
  observations?: string | null;
  occurredAt?: Date;
  actor: Actor;
}): Promise<{ movement: CashMovement; emailIds: string[] }> {
  return dbTx.transaction(async (tx) => {
    const movement = await appendCashMovement(tx, {
      ...input,
      movementType: "withdrawal",
      direction: "out",
      sourceType: "manual",
    });
    await recordAudit(tx, input.actor, { action: "cash.withdrawal", entityType: "cash_movement", entityId: movement.id, after: movement });
    const recipients = await getDirectorRecipients(tx);
    const emailIds = await enqueueEmails(
      tx,
      recipients.map((r) => ({
        eventType: "cash_withdrawal",
        recipient: r.email,
        recipientName: r.name,
        subject: "Notificación de retiro de caja",
        html: withdrawalNoticeEmail(movement),
        relatedEntityType: "cash_movement",
        relatedEntityId: movement.id,
        dedupeKey: `cash_withdrawal:${movement.id}:${r.email}`,
      })),
    );
    return { movement, emailIds };
  });
}

/** Saldo inicial de la caja (una sola vez; lo carga Dirección). */
export async function registerOpeningBalance(input: { amountCents: number; observations?: string | null; actor: Actor }) {
  return dbTx.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${CASH_LOCK_KEY})`);
    const [any] = await tx.select({ id: cashMovements.id }).from(cashMovements).limit(1);
    if (any) throw new CashError("El saldo inicial sólo se puede cargar antes del primer movimiento de caja");
    const m = await appendCashMovement(tx, {
      movementType: "income",
      direction: "in",
      sourceType: "opening",
      amountCents: input.amountCents,
      reason: "Saldo inicial de caja",
      observations: input.observations,
      actor: input.actor,
    });
    await recordAudit(tx, input.actor, { action: "cash.opening", entityType: "cash_movement", entityId: m.id, after: m });
    return m;
  });
}

/**
 * Corrección autorizada: un movimiento compensatorio que deshace uno manual (ingreso o retiro).
 * Los cobros de cuotas se corrigen anulando el pago, no desde acá.
 */
export async function reverseMovement(input: { movementId: string; reason: string; actor: Actor }): Promise<CashMovement> {
  return dbTx.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${CASH_LOCK_KEY})`);
    const [original] = await tx.select().from(cashMovements).where(eq(cashMovements.id, input.movementId)).limit(1);
    if (!original) throw new CashError("El movimiento no existe");
    if (original.sourceType !== "manual") {
      throw new CashError(
        original.sourceType === "payment"
          ? "Un cobro de cuota se corrige anulando el pago"
          : "Este movimiento no se puede revertir",
      );
    }
    const [already] = await tx.select({ id: cashMovements.id }).from(cashMovements).where(eq(cashMovements.reversalOfId, original.id)).limit(1);
    if (already) throw new CashError("Ese movimiento ya fue revertido");
    const reversal = await appendCashMovement(tx, {
      movementType: "adjustment",
      direction: original.direction === "in" ? "out" : "in",
      sourceType: "reversal",
      sourceId: original.id,
      amountCents: toCents(original.amount),
      reason: input.reason,
      reversalOfId: original.id,
      actor: input.actor,
    });
    await recordAudit(tx, input.actor, {
      action: "cash.reversal",
      entityType: "cash_movement",
      entityId: reversal.id,
      before: original,
      after: reversal,
      note: input.reason,
    });
    return reversal;
  });
}

/** Conciliación: compara el conteo físico contra el saldo del libro y deja constancia. */
export async function recordReconciliation(input: { countedCents: number; notes?: string | null; actor: Actor }) {
  return dbTx.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${CASH_LOCK_KEY})`);
    const expected = await getCashBalanceCents(tx);
    const [row] = await tx
      .insert(cashReconciliations)
      .values({
        countedAmount: fromCents(input.countedCents),
        expectedAmount: fromCents(expected),
        difference: fromCents(input.countedCents - expected),
        notes: input.notes?.trim() || null,
        createdBy: input.actor.id,
        createdByName: input.actor.name,
      })
      .returning();
    await recordAudit(tx, input.actor, { action: "cash.reconciliation", entityType: "cash_reconciliation", entityId: row.id, after: row });
    return row;
  });
}

/** Destinatarios de los avisos de caja: todos los directores, más CASH_ALERT_EMAIL si existe. */
export async function getDirectorRecipients(exec: DbExecutor = db): Promise<{ email: string; name: string }[]> {
  const directors = await exec.select({ email: profiles.email, name: profiles.fullName }).from(profiles).where(eq(profiles.role, "director"));
  const list = directors.filter((d) => d.email);
  const extra = process.env.CASH_ALERT_EMAIL?.trim();
  if (extra && !list.some((d) => d.email.toLowerCase() === extra.toLowerCase())) {
    list.push({ email: extra, name: "Dirección" });
  }
  return list;
}

export interface CashSummary {
  balanceCents: number;
  paymentIncomeCents: number;
  manualIncomeCents: number;
  openingCents: number;
  withdrawalsCents: number;
  reversalsOutCents: number;
  lastMovementAt: Date | null;
  movementCount: number;
}

export async function getCashSummary(): Promise<CashSummary> {
  const sum = (cond: ReturnType<typeof sql>) =>
    sql<string>`coalesce(sum(case when ${cond} then ${cashMovements.amount} else 0 end), 0)::text`;
  const [row] = await db
    .select({
      payments: sum(sql`${cashMovements.sourceType} = 'payment'`),
      manual: sum(sql`${cashMovements.sourceType} = 'manual' and ${cashMovements.direction} = 'in'`),
      opening: sum(sql`${cashMovements.sourceType} = 'opening'`),
      withdrawals: sum(sql`${cashMovements.movementType} = 'withdrawal'`),
      reversalsOut: sum(sql`${cashMovements.sourceType} = 'reversal' and ${cashMovements.direction} = 'out'`),
      last: sql<Date | null>`max(${cashMovements.createdAt})`,
      n: sql<number>`cast(count(*) as int)`,
    })
    .from(cashMovements);
  const balanceCents = await getCashBalanceCents();
  return {
    balanceCents,
    paymentIncomeCents: toCents(row?.payments ?? "0"),
    manualIncomeCents: toCents(row?.manual ?? "0"),
    openingCents: toCents(row?.opening ?? "0"),
    withdrawalsCents: toCents(row?.withdrawals ?? "0"),
    reversalsOutCents: toCents(row?.reversalsOut ?? "0"),
    lastMovementAt: row?.last ? new Date(row.last) : null,
    movementCount: row?.n ?? 0,
  };
}

export interface CashMovementFilters {
  from?: string; // YYYY-MM-DD
  to?: string;
  kind?: "payment" | "income" | "withdrawal" | "reversal";
  limit?: number;
}

export async function listCashMovements(filters: CashMovementFilters = {}) {
  const conds = [];
  if (filters.from) conds.push(gte(sql`(${cashMovements.occurredAt} at time zone 'America/Argentina/Cordoba')::date`, sql`${filters.from}::date`));
  if (filters.to) conds.push(lte(sql`(${cashMovements.occurredAt} at time zone 'America/Argentina/Cordoba')::date`, sql`${filters.to}::date`));
  if (filters.kind === "payment") conds.push(eq(cashMovements.sourceType, "payment"));
  if (filters.kind === "income") conds.push(sql`${cashMovements.sourceType} in ('manual', 'opening') and ${cashMovements.direction} = 'in'`);
  if (filters.kind === "withdrawal") conds.push(eq(cashMovements.movementType, "withdrawal"));
  if (filters.kind === "reversal") conds.push(eq(cashMovements.sourceType, "reversal"));
  return db
    .select()
    .from(cashMovements)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(cashMovements.seq))
    .limit(filters.limit ?? 200);
}

/** Ids de movimientos ya revertidos, para ocultar el botón "Revertir". */
export async function getReversedMovementIds(): Promise<Set<string>> {
  const rows = await db.select({ id: cashMovements.reversalOfId }).from(cashMovements).where(sql`${cashMovements.reversalOfId} is not null`);
  return new Set(rows.map((r) => r.id!));
}

export async function listReconciliations(limit = 10) {
  return db.select().from(cashReconciliations).orderBy(desc(cashReconciliations.createdAt)).limit(limit);
}
