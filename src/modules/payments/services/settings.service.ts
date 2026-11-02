import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, dbTx } from "@/lib/drizzle";
import { appSettings } from "@/lib/drizzle/schema";
import { recordAudit, type Actor, type DbExecutor } from "@/lib/audit";
import { DEFAULT_RATES, type PricingRates } from "../lib/pricing";

const RATES_KEY = "payments.rates";

export const pricingRatesSchema = z.object({
  transferDiscountPct: z.coerce.number().min(0, "El descuento no puede ser negativo").max(100, "El descuento no puede superar 100%"),
  cashDiscountPct: z.coerce.number().min(0, "El descuento no puede ser negativo").max(100, "El descuento no puede superar 100%"),
  cardSurchargePct: z.coerce.number().min(0, "El recargo no puede ser negativo").max(100, "El recargo no puede superar 100%"),
  discountLastDay: z.coerce.number().int("Ingresá un día entero").min(1, "El día debe estar entre 1 y 28").max(28, "El día debe estar entre 1 y 28"),
});

/** Política económica vigente. Si la clave no existe (migración sin aplicar) usa los valores por defecto. */
export async function getPricingRates(exec: DbExecutor = db): Promise<PricingRates> {
  try {
    const [row] = await exec.select().from(appSettings).where(eq(appSettings.key, RATES_KEY)).limit(1);
    const parsed = pricingRatesSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : DEFAULT_RATES;
  } catch {
    return DEFAULT_RATES;
  }
}

/** Guarda la política económica y deja rastro del valor anterior y del nuevo. */
export async function savePricingRates(rates: PricingRates, actor: Actor): Promise<void> {
  await dbTx.transaction(async (tx) => {
    const before = await getPricingRates(tx);
    await tx
      .insert(appSettings)
      .values({ key: RATES_KEY, value: rates, updatedBy: actor.id })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: rates, updatedBy: actor.id, updatedAt: new Date() } });
    await recordAudit(tx, actor, { action: "settings.pricing_rates", entityType: "app_setting", entityId: RATES_KEY, before, after: rates });
  });
}
