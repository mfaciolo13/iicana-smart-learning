import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, dbTx } from "@/lib/drizzle";
import { feeIncreases, feePriceHistory, payments, studentFeePlans } from "@/lib/drizzle/schema";
import { SYSTEM_ACTOR, recordAudit, type Actor } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/db-errors";
import { todayInstitute } from "@/lib/validation";
import { applyIncrease, validateIncrease, type IncreaseInput } from "../lib/increase";

export type FeeIncrease = typeof feeIncreases.$inferSelect;

/** Clave del lock que serializa la aplicación de aumentos (dos cron simultáneos no se pisan). */
const INCREASE_LOCK_KEY = 9_001_001;

/** Cuotas sin cobrar que el aumento actualiza: las que vencen desde su fecha de vigencia en adelante. */
const UNPAID = ["pending", "overdue", "suspended"] as const;

export class IncreaseError extends Error {}

export async function listIncreases(): Promise<FeeIncrease[]> {
  return db.select().from(feeIncreases).orderBy(desc(feeIncreases.effectiveDate), desc(feeIncreases.createdAt));
}

/** Cuántas cuotas y planes tocaría un aumento con esa vigencia (para el aviso previo a activarlo). */
export async function previewImpact(effectiveDate: string): Promise<{ payments: number; plans: number }> {
  const [p] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(payments)
    .where(and(inArray(payments.status, [...UNPAID]), gte(payments.dueDate, effectiveDate)));
  const [pl] = await db.select({ n: sql<number>`cast(count(*) as int)` }).from(studentFeePlans);
  return { payments: p?.n ?? 0, plans: pl?.n ?? 0 };
}

export async function createIncrease(input: IncreaseInput & { notes?: string | null }, actor: Actor): Promise<FeeIncrease> {
  const problem = validateIncrease(input, todayInstitute());
  if (problem) throw new IncreaseError(problem);
  try {
    return await dbTx.transaction(async (tx) => {
      const [row] = await tx
        .insert(feeIncreases)
        .values({
          percentage: input.percentage.toFixed(2),
          quarter: input.quarter,
          effectiveDate: input.effectiveDate,
          notes: input.notes?.trim() || null,
          createdBy: actor.id,
          createdByName: actor.name,
          updatedBy: actor.id,
          updatedByName: actor.name,
        })
        .returning();
      await recordAudit(tx, actor, { action: "fee_increase.created", entityType: "fee_increase", entityId: row.id, after: row });
      return row;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new IncreaseError("Ya hay un aumento cargado para ese trimestre. Modificá o cancelá el existente.");
    throw e;
  }
}

/** Un aumento programado se puede revisar y corregir hasta que entra en vigencia. */
export async function updateIncrease(id: string, input: IncreaseInput & { notes?: string | null }, actor: Actor): Promise<FeeIncrease> {
  const problem = validateIncrease(input, todayInstitute());
  if (problem) throw new IncreaseError(problem);
  try {
    return await dbTx.transaction(async (tx) => {
      const [before] = await tx.select().from(feeIncreases).where(eq(feeIncreases.id, id)).for("update").limit(1);
      if (!before) throw new IncreaseError("El aumento no existe");
      if (before.status !== "scheduled") throw new IncreaseError("Solo se puede modificar un aumento programado que todavía no entró en vigencia");
      const [row] = await tx
        .update(feeIncreases)
        .set({
          percentage: input.percentage.toFixed(2),
          quarter: input.quarter,
          effectiveDate: input.effectiveDate,
          notes: input.notes?.trim() || null,
          updatedBy: actor.id,
          updatedByName: actor.name,
          updatedAt: new Date(),
        })
        .where(eq(feeIncreases.id, id))
        .returning();
      await recordAudit(tx, actor, { action: "fee_increase.updated", entityType: "fee_increase", entityId: id, before, after: row });
      return row;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new IncreaseError("Ya hay un aumento cargado para ese trimestre.");
    throw e;
  }
}

export async function cancelIncrease(id: string, actor: Actor): Promise<void> {
  await dbTx.transaction(async (tx) => {
    const [before] = await tx.select().from(feeIncreases).where(eq(feeIncreases.id, id)).for("update").limit(1);
    if (!before) throw new IncreaseError("El aumento no existe");
    if (before.status !== "scheduled") throw new IncreaseError("Solo se puede cancelar un aumento programado");
    const [row] = await tx
      .update(feeIncreases)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedBy: actor.id, updatedByName: actor.name, updatedAt: new Date() })
      .where(eq(feeIncreases.id, id))
      .returning();
    await recordAudit(tx, actor, { action: "fee_increase.cancelled", entityType: "fee_increase", entityId: id, before, after: row });
  });
}

export interface ApplyResult {
  increaseId: string;
  quarter: string;
  payments: number;
  plans: number;
}

/**
 * Aplica un aumento programado cuya vigencia llegó. Todo en UNA transacción y con el aumento
 * bloqueado: si algo falla no queda nada a medias, y una segunda ejecución (cron repetido,
 * dos instancias) encuentra el aumento ya aplicado y no hace nada. Además los índices únicos de
 * fee_price_history impiden tocar dos veces la misma cuota con el mismo aumento.
 *
 *  - Cuotas: solo las SIN COBRAR que vencen desde la fecha de vigencia. Las cobradas, las anuladas
 *    y las vencidas anteriores conservan su importe; los pagos confirmados nunca se modifican.
 *  - Planes por alumno: todos, para que las cuotas nuevas nazcan con el precio actualizado.
 */
export async function applyScheduledIncrease(increaseId: string, actor: Actor = SYSTEM_ACTOR): Promise<ApplyResult | null> {
  return dbTx.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${INCREASE_LOCK_KEY})`);
    const [inc] = await tx.select().from(feeIncreases).where(eq(feeIncreases.id, increaseId)).for("update").limit(1);
    if (!inc || inc.status !== "scheduled" || inc.effectiveDate > todayInstitute()) return null;

    const percentage = Number(inc.percentage);
    const now = new Date();

    const cuotas = await tx
      .select()
      .from(payments)
      .where(and(inArray(payments.status, [...UNPAID]), gte(payments.dueDate, inc.effectiveDate)))
      .for("update");
    for (const c of cuotas) {
      const next = applyIncrease({ list: c.amount, transfer: c.transferPrice, cash: c.cashPrice }, percentage);
      await tx
        .insert(feePriceHistory)
        .values({
          increaseId: inc.id,
          scope: "payment",
          paymentId: c.id,
          oldList: c.amount,
          newList: next.list,
          oldTransfer: c.transferPrice,
          newTransfer: next.transfer,
          oldCash: c.cashPrice,
          newCash: next.cash,
          percentage: inc.percentage,
        })
        .onConflictDoNothing();
      await tx
        .update(payments)
        .set({ amount: next.list, transferPrice: next.transfer, cashPrice: next.cash, updatedAt: now })
        .where(and(eq(payments.id, c.id), inArray(payments.status, [...UNPAID])));
    }

    const plans = await tx.select().from(studentFeePlans);
    for (const p of plans) {
      const next = applyIncrease({ list: p.listPrice, transfer: p.transferPrice, cash: p.cashPrice }, percentage);
      await tx
        .insert(feePriceHistory)
        .values({
          increaseId: inc.id,
          scope: "plan",
          studentId: p.studentId,
          oldList: p.listPrice,
          newList: next.list,
          oldTransfer: p.transferPrice,
          newTransfer: next.transfer,
          oldCash: p.cashPrice,
          newCash: next.cash,
          percentage: inc.percentage,
        })
        .onConflictDoNothing();
      await tx
        .update(studentFeePlans)
        .set({ listPrice: next.list, transferPrice: next.transfer, cashPrice: next.cash, updatedAt: now })
        .where(eq(studentFeePlans.studentId, p.studentId));
    }

    await tx
      .update(feeIncreases)
      .set({ status: "applied", appliedAt: now, affectedPayments: cuotas.length, affectedPlans: plans.length, updatedAt: now })
      .where(eq(feeIncreases.id, inc.id));
    await recordAudit(tx, actor, {
      action: "fee_increase.applied",
      entityType: "fee_increase",
      entityId: inc.id,
      after: { quarter: inc.quarter, percentage: inc.percentage, cuotas: cuotas.length, planes: plans.length },
    });
    return { increaseId: inc.id, quarter: inc.quarter, payments: cuotas.length, plans: plans.length };
  });
}

/** Proceso automático: aplica todos los aumentos programados cuya vigencia ya llegó. */
export async function applyDueIncreases(): Promise<ApplyResult[]> {
  const due = await db
    .select({ id: feeIncreases.id })
    .from(feeIncreases)
    .where(and(eq(feeIncreases.status, "scheduled"), lte(feeIncreases.effectiveDate, todayInstitute())))
    .orderBy(asc(feeIncreases.effectiveDate));
  const results: ApplyResult[] = [];
  for (const d of due) {
    const r = await applyScheduledIncrease(d.id);
    if (r) results.push(r);
  }
  return results;
}

/** Historial de precios de una cuota (cuando un aumento la actualizó). */
export async function getPriceHistoryForPayment(paymentId: string) {
  return db
    .select({
      appliedAt: feePriceHistory.appliedAt,
      percentage: feePriceHistory.percentage,
      oldList: feePriceHistory.oldList,
      newList: feePriceHistory.newList,
      quarter: feeIncreases.quarter,
    })
    .from(feePriceHistory)
    .innerJoin(feeIncreases, eq(feePriceHistory.increaseId, feeIncreases.id))
    .where(and(eq(feePriceHistory.paymentId, paymentId), eq(feePriceHistory.scope, "payment")))
    .orderBy(desc(feePriceHistory.appliedAt));
}

